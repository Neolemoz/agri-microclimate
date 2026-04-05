import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";

const SCREEN_HOME = "Home";
const SCREEN_MAP = "Farm Map";
const SCREEN_CONTROL = "Control";
const HISTORY_LIMIT = 6;

const palette = {
  skyTop: "#FFFFFF",
  skyMid: "#FFFFFF",
  skyBottom: "#FFFFFF",
  grass: "#d3efc1",
  soil: "#b78556",
  soilDark: "#8d603d",
  leaf: "#88c979",
  leafDark: "#4f8153",
  cream: "#fff7ea",
  peach: "#f9dfbf",
  pink: "#ffdce7",
  blue: "#d6f1ff",
  yellow: "#ffe9a9",
  brown: "#6b4e39",
  brownSoft: "#8e6f58",
  white: "#fffdf8",
  shadow: "#d2bba3",
  warm: "#f3c45f",
  humid: "#79bfe7",
  healthy: "#7cc97b",
  surface: "#FFFFFF",
  cardSurface: "#FFFEFB",
  mutedSurface: "#F1F3EF",
  textMuted: "#7A8475",
};

const topBarInfo = {
  weather: "Sunny Breeze",
};

const initialNodes = [
  {
    id: "A",
    name: "Module 1",
    temp: 24,
    humidity: 63,
    state: "healthy",
    emoji: "🌱",
    fanOn: true,
    windowOpen: false,
    waterOn: true,
    positionLabel: "Module 1",
    cornerLabel: "Top Left",
  },
  {
    id: "B",
    name: "Module 2",
    temp: 27,
    humidity: 58,
    state: "warm",
    emoji: "🌞",
    fanOn: false,
    windowOpen: true,
    waterOn: false,
    positionLabel: "Module 2",
    cornerLabel: "Top Right",
  },
  {
    id: "C",
    name: "Module 3",
    temp: 23,
    humidity: 72,
    state: "humid",
    emoji: "💧",
    fanOn: true,
    windowOpen: false,
    waterOn: false,
    positionLabel: "Module 3",
    cornerLabel: "Bottom Left",
  },
  {
    id: "D",
    name: "Module 4",
    temp: 25,
    humidity: 61,
    state: "healthy",
    emoji: "🌿",
    fanOn: false,
    windowOpen: true,
    waterOn: false,
    positionLabel: "Module 4",
    cornerLabel: "Bottom Right",
  },
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getStateMeta(state) {
  if (state === "warm") {
    return {
      label: "Warm",
      emoji: "☀️",
      accent: palette.warm,
      card: "#ffe7b8",
      deep: "#a16b1f",
    };
  }

  if (state === "humid") {
    return {
      label: "Humid",
      emoji: "💧",
      accent: palette.humid,
      card: "#d8f2ff",
      deep: "#3b7397",
    };
  }

  return {
    label: "Healthy",
    emoji: "🌱",
    accent: palette.healthy,
    card: "#dff5d6",
    deep: palette.leafDark,
  };
}

function createNextFarmData(currentNodes) {
  return currentNodes.map((node, index) => {
    const tempShift = [-1, 1, 0, 1][index];
    const humidityShift = [1, -1, 1, 0][index];
    const temp = clamp(node.temp + tempShift, 22, 29);
    const humidity = clamp(node.humidity + humidityShift, 56, 76);

    let state = "healthy";
    if (temp >= 27) {
      state = "warm";
    } else if (humidity >= 70) {
      state = "humid";
    }

    return {
      ...node,
      temp,
      humidity,
      state,
      emoji: state === "warm" ? "🌞" : state === "humid" ? "💧" : index === 3 ? "🌿" : "🌱",
      windowOpen: state === "warm" ? true : node.windowOpen,
      waterOn: state === "humid" ? false : node.waterOn,
    };
  });
}

function getCurrentTimeLabel() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimeWithOffset(stepOffset = 0) {
  const date = new Date();
  date.setMinutes(date.getMinutes() + stepOffset * 30);

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function createHistoryPoint(nodes, stepOffset = 0) {
  const avgTemp = Number((nodes.reduce((sum, node) => sum + node.temp, 0) / nodes.length).toFixed(1));
  const avgHumidity = Number(
    (nodes.reduce((sum, node) => sum + node.humidity, 0) / nodes.length).toFixed(1)
  );

  const isHealthyForPlants = avgTemp >= 23 && avgTemp <= 26 && avgHumidity >= 58 && avgHumidity <= 70;

  let note = "Healthy for plants";
  if (avgTemp > 26) {
    note = "A bit warm for plants";
  } else if (avgHumidity > 70) {
    note = "Quite humid for plants";
  } else if (avgTemp < 23) {
    note = "A little cool for growth";
  } else if (avgHumidity < 58) {
    note = "A touch dry for leaves";
  }

  return {
    time: formatTimeWithOffset(stepOffset),
    avgTemp,
    avgHumidity,
    isHealthyForPlants,
    note,
  };
}

function buildInitialHistory(nodes) {
  return [-5, -4, -3, -2, -1, 0].map((step) => createHistoryPoint(nodes, step));
}

function formatDisplayDate(date) {
  return date.toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatMonthYear(date) {
  return date.toLocaleDateString([], {
    month: "long",
    year: "numeric",
  });
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildCalendarDays(referenceDate) {
  const firstDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const startDay = firstDay.getDay();
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - startDay);

  return Array.from({ length: 35 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return date;
  });
}

function buildRecentDates(referenceDate) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(referenceDate);
    date.setDate(referenceDate.getDate() - index);
    return date;
  });
}

function TopBar({ selectedDate, onOpenCalendar }) {
  return (
    <Pressable style={styles.topBar} onPress={onOpenCalendar}>
      <Text style={styles.topBarDay}>{formatDisplayDate(selectedDate)}</Text>
      <Text style={styles.topBarWeather}>{topBarInfo.weather}</Text>
    </Pressable>
  );
}

function CalendarModal({ visible, selectedDate, onClose, onSelectDate }) {
  const calendarDays = useMemo(() => buildCalendarDays(selectedDate), [selectedDate]);
  const recentDates = useMemo(() => buildRecentDates(selectedDate), [selectedDate]);
  const today = new Date();
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.calendarBackdrop}>
        <View style={styles.calendarCard}>
          <Text style={styles.calendarTitle}>Calendar</Text>
          <Text style={styles.calendarSubtitle}>Overview of recent days and this month</Text>

          <Text style={styles.calendarMonthLabel}>{formatMonthYear(selectedDate)}</Text>

          <View style={styles.weekdayRow}>
            {weekdayLabels.map((label) => (
              <Text key={label} style={styles.weekdayText}>
                {label}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarDays.map((date, index) => {
              const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
              const isSelected = isSameDay(date, selectedDate);
              const isToday = isSameDay(date, today);
              const isPastOrToday = date <= today;

              return (
                <Pressable
                  key={`${date.toISOString()}-${index}`}
                  style={[
                    styles.calendarDay,
                    isSelected && styles.calendarDaySelected,
                    isToday && styles.calendarDayToday,
                    !isCurrentMonth && styles.calendarDayMuted,
                  ]}
                  onPress={() => onSelectDate(date)}
                  disabled={!isPastOrToday}
                >
                  <Text
                    style={[
                      styles.calendarDayText,
                      isSelected && styles.calendarDayTextSelected,
                      !isCurrentMonth && styles.calendarDayTextMuted,
                      !isPastOrToday && styles.calendarDayDisabledText,
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.recentDatesSection}>
            <Text style={styles.recentDatesTitle}>Recent days</Text>
            <View style={styles.recentDatesList}>
              {recentDates.map((date) => (
                <Pressable
                  key={date.toISOString()}
                  onPress={() => onSelectDate(date)}
                  style={[
                    styles.recentDateChip,
                    isSameDay(date, selectedDate) && styles.recentDateChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.recentDateText,
                      isSameDay(date, selectedDate) && styles.recentDateTextActive,
                    ]}
                  >
                    {date.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable onPress={onClose} style={styles.calendarCloseButton}>
            <Text style={styles.calendarCloseText}>Close Calendar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ScreenTabs({ activeScreen, onChange }) {
  const tabs = [
    { id: SCREEN_HOME, label: "Home" },
    { id: SCREEN_MAP, label: "Map" },
    { id: SCREEN_CONTROL, label: "Control" },
  ];

  return (
    <View style={styles.tabWrap}>
      {tabs.map((tab) => {
        const active = tab.id === activeScreen;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={[styles.tabButton, active && styles.tabButtonActive]}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function FloatingLeaf() {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim]);

  return (
    <Animated.Text
      style={[
        styles.floatingLeaf,
        {
          transform: [
            {
              translateY: floatAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -8],
              }),
            },
            {
              rotate: floatAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["-4deg", "4deg"],
              }),
            },
          ],
        },
      ]}
    >
      🍃
    </Animated.Text>
  );
}

function TinyFarmChart({ history }) {
  const maxTemp = Math.max(...history.map((item) => item.avgTemp), 30);
  const minTemp = Math.min(...history.map((item) => item.avgTemp), 20);
  const maxHumidity = Math.max(...history.map((item) => item.avgHumidity), 80);
  const minHumidity = Math.min(...history.map((item) => item.avgHumidity), 50);
  const chartWidth = 280;
  const chartHeight = 120;

  const buildLinePoints = (values, min, max) =>
    values.map((value, index) => {
      const x = history.length === 1 ? chartWidth / 2 : (index / (history.length - 1)) * chartWidth;
      const y = chartHeight - ((value - min) / (max - min || 1)) * (chartHeight - 20) - 10;

      return { x, y };
    });

  const tempPoints = buildLinePoints(
    history.map((item) => item.avgTemp),
    minTemp,
    maxTemp
  );
  const humidityPoints = buildLinePoints(
    history.map((item) => item.avgHumidity),
    minHumidity,
    maxHumidity
  );

  const pointsToPath = (points) =>
    points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const chartAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    chartAnim.setValue(0);
    Animated.timing(chartAnim, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [chartAnim, history]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const latestTempPoint = tempPoints[tempPoints.length - 1];
  const latestHumidityPoint = humidityPoints[humidityPoints.length - 1];

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Text style={styles.panelTitle}>Farm Mood by Time</Text>
        <Text style={styles.chartHeaderMeta}>Last {history.length} moments</Text>
      </View>

      <View style={styles.chartLegendRow}>
        <View style={styles.chartLegendItem}>
          <View style={[styles.chartLegendDot, { backgroundColor: "#f39ab5" }]} />
          <Text style={styles.chartLegendText}>Temperature</Text>
        </View>
        <View style={styles.chartLegendItem}>
          <View style={[styles.chartLegendDot, { backgroundColor: "#7cc7ec" }]} />
          <Text style={styles.chartLegendText}>Humidity</Text>
        </View>
      </View>

      <Animated.View
        style={[
          styles.chartPlot,
          {
            opacity: chartAnim,
            transform: [
              {
                translateY: chartAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [8, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Svg width="100%" height={chartHeight + 8} viewBox={`0 0 ${chartWidth} ${chartHeight + 8}`}>
          <Path d={pointsToPath(tempPoints)} stroke="#f39ab5" strokeWidth="4" fill="none" strokeLinecap="round" />
          <Path
            d={pointsToPath(humidityPoints)}
            stroke="#7cc7ec"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />

          {tempPoints.map((point, index) => (
            <Circle key={`temp-${index}`} cx={point.x} cy={point.y} r="4.5" fill="#f39ab5" />
          ))}

          {humidityPoints.map((point, index) => (
            <Circle key={`humidity-${index}`} cx={point.x} cy={point.y} r="4.5" fill="#7cc7ec" />
          ))}
        </Svg>
      </Animated.View>

      <View style={styles.chartPulseRow}>
        <Animated.View
          style={[
            styles.chartPulseDot,
            styles.chartPulseDotTemp,
            {
              transform: [
                {
                  scale: pulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.2],
                  }),
                },
              ],
            },
          ]}
        />
        <Text style={styles.chartPulseText}>Latest temp at {latestTempPoint ? history[history.length - 1].time : ""}</Text>
      </View>
      <View style={styles.chartPulseRow}>
        <Animated.View
          style={[
            styles.chartPulseDot,
            styles.chartPulseDotHumidity,
            {
              transform: [
                {
                  scale: pulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.2],
                  }),
                },
              ],
            },
          ]}
        />
        <Text style={styles.chartPulseText}>
          Latest humidity at {latestHumidityPoint ? history[history.length - 1].time : ""}
        </Text>
      </View>

      <View style={styles.chartTimeRow}>
        {history.map((item, index) => (
          <Text key={`${item.time}-${index}`} style={styles.chartTime}>
            {item.time}
          </Text>
        ))}
      </View>
    </View>
  );
}

function FarmHealthTimeline({ history }) {
  return (
    <View style={styles.panelCard}>
      <Text style={styles.panelTitle}>Plant Comfort Timeline 🌾</Text>
      {history.map((item, index) => (
        <View key={`${item.time}-health-${index}`} style={styles.timelineRow}>
          <View
            style={[
              styles.timelineBadge,
              item.isHealthyForPlants ? styles.timelineBadgeHealthy : styles.timelineBadgeCare,
            ]}
          >
            <Text style={styles.timelineBadgeText}>{item.isHealthyForPlants ? "Healthy" : "Care"}</Text>
          </View>
          <View style={styles.timelineTextWrap}>
            <Text style={styles.timelineTime}>{item.time}</Text>
            <Text style={styles.timelineNote}>{item.note}</Text>
            <Text style={styles.timelineMeta}>
              {item.avgTemp}°C • {item.avgHumidity}%
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function HomeScreen({ nodes, history }) {
  const avgTemp = useMemo(
    () => (nodes.reduce((sum, node) => sum + node.temp, 0) / nodes.length).toFixed(1),
    [nodes]
  );
  const avgHumidity = useMemo(
    () => (nodes.reduce((sum, node) => sum + node.humidity, 0) / nodes.length).toFixed(1),
    [nodes]
  );

  const warmCount = nodes.filter((node) => node.state === "warm").length;
  const humidCount = nodes.filter((node) => node.state === "humid").length;

  let statusText = "Everything looks good";
  if (warmCount > 0) {
    statusText = "A bit warm today";
  } else if (humidCount > 0) {
    statusText = "Water level feels extra cozy";
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <TinyFarmChart history={history} />

      <LinearGradient colors={[palette.cream, "#fff3d5"]} style={styles.heroCard}>
        <Text style={styles.heroTitle}>My Smart Farm</Text>
        <Text style={styles.heroSubtitle}>Your plants are happy</Text>

        <View style={styles.statusRibbon}>
          <Text style={styles.statusRibbonText}>{statusText}</Text>
        </View>

        <View style={styles.heroStatsRow}>
          <View style={styles.chipStat}>
            <Text style={styles.chipStatLabel}>Patches</Text>
            <Text style={styles.chipStatValue}>4 Active</Text>
          </View>
          <View style={styles.chipStat}>
            <Text style={styles.chipStatLabel}>Mood</Text>
            <Text style={styles.chipStatValue}>Cozy Day</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.metricRow}>
        <LinearGradient colors={["#ffdfe9", "#fff1f5"]} style={styles.metricCard}>
          <Text style={styles.metricLabel}>Temperature</Text>
          <Text style={styles.metricValue}>{avgTemp}°C</Text>
        </LinearGradient>

        <LinearGradient colors={["#d9f1ff", "#f1fbff"]} style={styles.metricCard}>
          <Text style={styles.metricLabel}>Humidity</Text>
          <Text style={styles.metricValue}>{avgHumidity}%</Text>
        </LinearGradient>
      </View>

      <View style={styles.panelCard}>
        <Text style={styles.panelTitle}>Farm Journal</Text>
        <Text style={styles.panelNote}>Water level is good.</Text>
        <Text style={styles.panelNote}>A gentle breeze is helping today.</Text>
        <Text style={styles.panelNote}>The veggie patches look extra cheerful.</Text>
      </View>
      <FarmHealthTimeline history={[...history].reverse()} />
    </ScrollView>
  );
}

function PatchTile({ node, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const colorAnim = useRef(new Animated.Value(1)).current;
  const prevAccent = useRef(getStateMeta(node.state).card);

  useEffect(() => {
    colorAnim.setValue(0);
    Animated.timing(colorAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: false,
    }).start(() => {
      prevAccent.current = getStateMeta(node.state).card;
    });
  }, [colorAnim, node.state]);

  const meta = getStateMeta(node.state);
  const animatedCardColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [prevAccent.current, meta.card],
  });

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.94,
        speed: 28,
        bounciness: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        speed: 18,
        bounciness: 12,
        useNativeDriver: true,
      }),
    ]).start();

    onPress(node);
  };

  return (
    <Pressable style={styles.patchPressable} onPress={handlePress}>
      <Animated.View
        style={[
          styles.patchOuter,
          {
            transform: [
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        <Animated.View style={[styles.patchInner, { backgroundColor: animatedCardColor }]}>
          <Text style={styles.patchTitle}>{node.name}</Text>
          <Text style={[styles.patchMeta, { color: meta.deep }]}>
            {meta.label}
          </Text>
          <Text style={styles.patchSubtle}>Sensor {node.id}</Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

function FarmMapScreen({ nodes, selectedNode, onSelectNode, onCloseNode }) {
  const selectedMeta = selectedNode ? getStateMeta(selectedNode.state) : null;

  return (
    <View style={styles.mapScreenBackground}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.mapCard}>
          <Text style={styles.mapCardTitle}>Farm Layout Map</Text>
          <Text style={styles.panelSubtitle}>
            Tap a module to view its sensor status in this farm simulation.
          </Text>
          <View style={styles.mapGuideGrid}>
            <Text style={styles.mapGuideItem}>Module 1: Top Left</Text>
            <Text style={styles.mapGuideItem}>Module 2: Top Right</Text>
            <Text style={styles.mapGuideItem}>Module 3: Bottom Left</Text>
            <Text style={styles.mapGuideItem}>Module 4: Bottom Right</Text>
          </View>

          <View style={styles.patchGrid}>
            {nodes.map((node) => (
              <PatchTile key={node.id} node={node} onPress={onSelectNode} />
            ))}
          </View>
        </View>

        <Modal visible={Boolean(selectedNode)} transparent animationType="fade" onRequestClose={onCloseNode}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{selectedNode?.name}</Text>
              <View
                style={[
                  styles.modalBadge,
                  { backgroundColor: selectedMeta?.card || "#EAF7E7" },
                ]}
              >
                <Text style={styles.modalBadgeText}>
                  {selectedMeta?.label}
                </Text>
              </View>
              <Text style={styles.modalInfo}>Label: {selectedNode?.positionLabel}</Text>
              <Text style={styles.modalInfo}>Position: {selectedNode?.cornerLabel}</Text>
              <Text style={styles.modalInfo}>Sensor ID: {selectedNode?.id}</Text>
              <Text style={styles.modalInfo}>Temperature: {selectedNode?.temp}°C</Text>
              <Text style={styles.modalInfo}>Humidity: {selectedNode?.humidity}%</Text>

              <Pressable onPress={onCloseNode} style={styles.ctaButton}>
                <Text style={styles.ctaButtonText}>Close Patch Card</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

function FanSpinner({ active }) {
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      spinAnim.stopAnimation();
      spinAnim.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();

    return () => loop.stop();
  }, [active, spinAnim]);

  return (
    <Animated.View
      style={[
        styles.fanEmoji,
        {
          transform: [
            {
              rotate: spinAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0deg", "360deg"],
              }),
            },
          ],
        },
      ]}
    >
      <Svg width="28" height="28" viewBox="0 0 28 28">
        <Ellipse cx="14" cy="6.5" rx="4.1" ry="6.2" fill="#7A8475" />
        <Ellipse cx="21.3" cy="17" rx="4.1" ry="6.2" transform="rotate(120 21.3 17)" fill="#7A8475" />
        <Ellipse cx="6.7" cy="17" rx="4.1" ry="6.2" transform="rotate(240 6.7 17)" fill="#7A8475" />
        <Circle cx="14" cy="14" r="3.2" fill="#6b4e39" />
      </Svg>
    </Animated.View>
  );
}

function CuteDeviceControl({ label, active, accent, onOn, onOff }) {
  const pulseAnim = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    if (!active) {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();

    return () => loop.stop();
  }, [active, pulseAnim]);

  return (
    <View style={styles.deviceCard}>
      <View style={styles.deviceHeader}>
        <View style={styles.deviceTitleRow}>
          <View>
            <Text style={styles.deviceLabel}>{label}</Text>
            <Text style={styles.deviceState}>{active ? "ON" : "OFF"}</Text>
          </View>
        </View>

        <Animated.View
          style={[
            styles.deviceBubble,
            { backgroundColor: active ? accent : "#E9ECE6" },
            active && {
              transform: [
                {
                  scale: pulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.08],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.deviceBubbleText}>{active ? "Active" : "Idle"}</Text>
        </Animated.View>
      </View>

      <View style={styles.deviceToggleRow}>
        <Pressable onPress={onOn} style={[styles.toggleButton, active && styles.toggleButtonOn]}>
          <Text style={[styles.toggleButtonText, active && styles.toggleButtonTextOn]}>ON</Text>
        </Pressable>

        <Pressable onPress={onOff} style={[styles.toggleButton, !active && styles.toggleButtonOff]}>
          <Text style={[styles.toggleButtonText, !active && styles.toggleButtonTextOff]}>OFF</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ZoneControlCard({ node, onSetDevice }) {
  return (
    <LinearGradient colors={["#fff7ea", "#ffe7c9"]} style={styles.controlCard}>
      <View style={styles.controlTopRow}>
        <View>
          <Text style={styles.controlTitle}>Zone {node.id}</Text>
          <Text style={styles.controlSubtitle}>Cute controls for airflow, windows, and watering.</Text>
        </View>
        <FanSpinner active={node.fanOn} />
      </View>

      <View style={styles.controlDevicesWrap}>
        <CuteDeviceControl
          label="Fan"
          active={node.fanOn}
          accent="#D8F1FF"
          onOn={() => onSetDevice(node.id, "fanOn", true)}
          onOff={() => onSetDevice(node.id, "fanOn", false)}
        />
        <CuteDeviceControl
          label="Window"
          active={node.windowOpen}
          accent="#E3F2D6"
          onOn={() => onSetDevice(node.id, "windowOpen", true)}
          onOff={() => onSetDevice(node.id, "windowOpen", false)}
        />
        <CuteDeviceControl
          label="Water"
          active={node.waterOn}
          accent="#D9EEFF"
          onOn={() => onSetDevice(node.id, "waterOn", true)}
          onOff={() => onSetDevice(node.id, "waterOn", false)}
        />
      </View>
    </LinearGradient>
  );
}

function ControlScreen({ nodes, onSetDevice }) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.panelCard}>
        <Text style={styles.panelTitle}>Control Barn</Text>
        <Text style={styles.panelSubtitle}>Big comfy controls for air, windows, and watering.</Text>
      </View>

      {nodes.map((node) => (
        <ZoneControlCard key={node.id} node={node} onSetDevice={onSetDevice} />
      ))}

      <View style={styles.panelCard}>
        <Text style={styles.panelTitle}>Farm Whisper</Text>
        <Text style={styles.panelNote}>The breeze is soft and steady today.</Text>
        <Text style={styles.panelNote}>Open windows when it feels stuffy, and water when leaves feel dry.</Text>
      </View>
    </ScrollView>
  );
}

export default function App() {
  const [activeScreen, setActiveScreen] = useState(SCREEN_HOME);
  const [nodes, setNodes] = useState(initialNodes);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [history, setHistory] = useState(() => buildInitialHistory(initialNodes));
  const historyStepRef = useRef(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setNodes((currentNodes) => {
        const nextNodes = createNextFarmData(currentNodes);
        setHistory((currentHistory) => [
          ...currentHistory.slice(-(HISTORY_LIMIT - 1)),
          createHistoryPoint(nextNodes, historyStepRef.current),
        ]);
        historyStepRef.current += 1;
        return nextNodes;
      });
    }, 1800000);

    return () => clearInterval(interval);
  }, []);

  const handleSetDevice = (zoneId, deviceKey, nextValue) => {
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === zoneId
          ? {
              ...node,
              [deviceKey]: nextValue,
            }
          : node
      )
    );
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={palette.skyTop} />
        <View style={styles.background}>
          <TopBar selectedDate={selectedDate} onOpenCalendar={() => setCalendarVisible(true)} />
          <ScreenTabs activeScreen={activeScreen} onChange={setActiveScreen} />

          {activeScreen === SCREEN_HOME && <HomeScreen nodes={nodes} history={history} />}
          {activeScreen === SCREEN_MAP && (
            <FarmMapScreen
              nodes={nodes}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
              onCloseNode={() => setSelectedNode(null)}
            />
          )}
          {activeScreen === SCREEN_CONTROL && <ControlScreen nodes={nodes} onSetDevice={handleSetDevice} />}

          <CalendarModal
            visible={calendarVisible}
            selectedDate={selectedDate}
            onClose={() => setCalendarVisible(false)}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setCalendarVisible(false);
            }}
          />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  background: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  mapScreenBackground: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  topBar: {
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  topBarDay: {
    color: palette.brown,
    fontSize: 20,
    fontWeight: "700",
  },
  topBarWeather: {
    color: palette.textMuted,
    fontSize: 14,
    marginTop: 4,
    fontWeight: "400",
  },
  calendarBackdrop: {
    flex: 1,
    backgroundColor: "rgba(51, 44, 36, 0.18)",
    justifyContent: "center",
    padding: 20,
  },
  calendarCard: {
    backgroundColor: palette.cardSurface,
    borderRadius: 24,
    padding: 20,
    shadowColor: palette.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  calendarTitle: {
    color: palette.brown,
    fontSize: 24,
    fontWeight: "700",
  },
  calendarSubtitle: {
    color: palette.textMuted,
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
  calendarMonthLabel: {
    color: palette.brown,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 18,
  },
  weekdayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  weekdayText: {
    width: "14.28%",
    textAlign: "center",
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: "400",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    rowGap: 8,
  },
  calendarDay: {
    width: "14.28%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 14,
  },
  calendarDaySelected: {
    backgroundColor: "#DDEFD8",
  },
  calendarDayToday: {
    borderWidth: 1,
    borderColor: "#C7D9C2",
  },
  calendarDayMuted: {
    opacity: 0.58,
  },
  calendarDayText: {
    color: palette.brown,
    fontSize: 14,
    fontWeight: "400",
  },
  calendarDayTextSelected: {
    color: palette.leafDark,
    fontWeight: "700",
  },
  calendarDayTextMuted: {
    color: palette.textMuted,
  },
  calendarDayDisabledText: {
    color: "#B9C0B3",
  },
  recentDatesSection: {
    marginTop: 18,
  },
  recentDatesTitle: {
    color: palette.brown,
    fontSize: 16,
    fontWeight: "700",
  },
  recentDatesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  recentDateChip: {
    backgroundColor: palette.mutedSurface,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  recentDateChipActive: {
    backgroundColor: "#DDEFD8",
  },
  recentDateText: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: "400",
  },
  recentDateTextActive: {
    color: palette.leafDark,
    fontWeight: "700",
  },
  calendarCloseButton: {
    marginTop: 20,
    backgroundColor: palette.leaf,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
  },
  calendarCloseText: {
    color: palette.white,
    fontSize: 16,
    fontWeight: "700",
  },
  tabWrap: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    backgroundColor: palette.mutedSurface,
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: "#DDEFD8",
  },
  tabText: {
    color: palette.brown,
    fontSize: 14,
    fontWeight: "400",
  },
  tabTextActive: {
    color: palette.leafDark,
    fontWeight: "700",
  },
  content: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 16,
    gap: 12,
  },
  heroCard: {
    borderRadius: 28,
    padding: 22,
    overflow: "hidden",
    shadowColor: palette.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  floatingLeaf: {
    position: "absolute",
    top: 16,
    right: 18,
    fontSize: 22,
  },
  heroEyebrow: {
    color: palette.brownSoft,
    fontWeight: "700",
    fontSize: 13,
    marginBottom: 8,
  },
  heroTitle: {
    color: palette.brown,
    fontSize: 31,
    fontWeight: "900",
  },
  heroSubtitle: {
    color: palette.brownSoft,
    fontSize: 17,
    marginTop: 8,
  },
  statusRibbon: {
    backgroundColor: palette.grass,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 16,
  },
  statusRibbonText: {
    color: palette.leafDark,
    fontWeight: "800",
    fontSize: 15,
  },
  heroStatsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  chipStat: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderRadius: 18,
    padding: 14,
  },
  chipStatLabel: {
    color: palette.brownSoft,
    fontWeight: "700",
    fontSize: 13,
  },
  chipStatValue: {
    color: palette.brown,
    fontWeight: "800",
    fontSize: 18,
    marginTop: 6,
  },
  metricRow: {
    flexDirection: "row",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 24,
    padding: 18,
    shadowColor: palette.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  metricEmoji: {
    fontSize: 24,
  },
  metricLabel: {
    marginTop: 10,
    color: palette.brown,
    fontWeight: "700",
    fontSize: 16,
  },
  metricValue: {
    marginTop: 8,
    color: palette.brown,
    fontSize: 28,
    fontWeight: "900",
  },
  panelCard: {
    backgroundColor: "rgba(255, 250, 245, 0.97)",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
    shadowColor: palette.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  chartCard: {
    backgroundColor: "rgba(255, 250, 245, 0.97)",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
    shadowColor: palette.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 12,
  },
  chartHeaderMeta: {
    color: palette.brownSoft,
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 1,
  },
  chartLegendRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 12,
  },
  chartLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chartLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  chartLegendText: {
    color: palette.brownSoft,
    fontWeight: "700",
    fontSize: 14,
  },
  chartPlot: {
    marginTop: 18,
    backgroundColor: "rgba(255,255,255,0.58)",
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 18,
    minHeight: 152,
    justifyContent: "center",
  },
  chartTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 6,
  },
  chartPulseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  chartPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  chartPulseDotTemp: {
    backgroundColor: "#f39ab5",
  },
  chartPulseDotHumidity: {
    backgroundColor: "#7cc7ec",
  },
  chartPulseText: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: "400",
  },
  chartTime: {
    color: palette.brownSoft,
    fontSize: 11,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  panelTitle: {
    color: palette.brown,
    fontWeight: "900",
    fontSize: 24,
    flexShrink: 1,
  },
  panelSubtitle: {
    color: palette.brownSoft,
    fontSize: 16,
    marginTop: 8,
    lineHeight: 22,
  },
  panelNote: {
    color: palette.brownSoft,
    fontSize: 16,
    marginTop: 10,
    lineHeight: 22,
  },
  timelineRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
    alignItems: "flex-start",
  },
  timelineBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 2,
  },
  timelineBadgeHealthy: {
    backgroundColor: "#dff5d6",
  },
  timelineBadgeCare: {
    backgroundColor: "#ffe8ba",
  },
  timelineBadgeText: {
    color: palette.brown,
    fontSize: 12,
    fontWeight: "800",
  },
  timelineTextWrap: {
    flex: 1,
  },
  timelineTime: {
    color: palette.brown,
    fontSize: 15,
    fontWeight: "800",
  },
  timelineNote: {
    color: palette.brownSoft,
    fontSize: 15,
    marginTop: 3,
  },
  timelineMeta: {
    color: palette.brownSoft,
    fontSize: 13,
    marginTop: 3,
    fontWeight: "700",
  },
  mapCard: {
    backgroundColor: palette.cardSurface,
    borderRadius: 18,
    padding: 16,
    shadowColor: palette.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  mapCardTitle: {
    color: palette.brown,
    fontSize: 24,
    fontWeight: "700",
  },
  patchGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
    marginTop: 14,
  },
  patchPressable: {
    width: "48%",
  },
  mapGuideText: {
    color: palette.textMuted,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
    marginTop: 8,
  },
  mapGuideGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  mapGuideItem: {
    width: "48%",
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
  },
  patchOuter: {
    borderRadius: 18,
    overflow: "hidden",
    minHeight: 116,
    shadowColor: palette.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  patchInner: {
    flex: 1,
    padding: 14,
    justifyContent: "space-between",
  },
  patchTitle: {
    color: palette.brown,
    fontSize: 17,
    fontWeight: "700",
  },
  patchMeta: {
    fontSize: 14,
    fontWeight: "400",
    marginTop: 4,
  },
  patchSubtle: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: "400",
    marginTop: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(82, 62, 46, 0.26)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: palette.cardSurface,
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    shadowColor: palette.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  modalEmoji: {
    fontSize: 24,
  },
  modalTitle: {
    marginTop: 10,
    color: palette.brown,
    fontSize: 24,
    fontWeight: "700",
  },
  modalBadge: {
    marginTop: 12,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  modalBadgeText: {
    color: palette.leafDark,
    fontSize: 14,
    fontWeight: "400",
  },
  modalInfo: {
    marginTop: 12,
    color: palette.textMuted,
    fontSize: 16,
    fontWeight: "400",
  },
  ctaButton: {
    marginTop: 22,
    backgroundColor: palette.leaf,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    minWidth: "100%",
    alignItems: "center",
  },
  ctaButtonText: {
    color: palette.white,
    fontSize: 17,
    fontWeight: "900",
  },
  controlCard: {
    borderRadius: 24,
    padding: 14,
    shadowColor: palette.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  controlTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  controlTitle: {
    color: palette.brown,
    fontSize: 21,
    fontWeight: "900",
  },
  controlSubtitle: {
    color: palette.brownSoft,
    fontSize: 13,
    marginTop: 4,
  },
  controlDevicesWrap: {
    marginTop: 10,
    gap: 8,
  },
  deviceCard: {
    backgroundColor: "rgba(255,255,255,0.68)",
    borderRadius: 18,
    padding: 10,
  },
  deviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  deviceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  deviceEmoji: {
    fontSize: 17,
  },
  deviceLabel: {
    color: palette.brown,
    fontSize: 15,
    fontWeight: "700",
  },
  deviceState: {
    color: palette.textMuted,
    fontSize: 11,
    marginTop: 1,
    fontWeight: "400",
  },
  deviceBubble: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  deviceBubbleText: {
    color: palette.brown,
    fontSize: 10,
    fontWeight: "700",
  },
  deviceToggleRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  fanEmoji: {
    fontSize: 22,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  toggleButton: {
    flex: 1,
    backgroundColor: palette.peach,
    borderRadius: 18,
    paddingVertical: 10,
    alignItems: "center",
  },
  toggleButtonOn: {
    backgroundColor: "#d6efc9",
  },
  toggleButtonOff: {
    backgroundColor: "#ffd9df",
  },
  toggleButtonText: {
    color: palette.brown,
    fontSize: 14,
    fontWeight: "900",
  },
  toggleButtonTextOn: {
    color: palette.leafDark,
  },
  toggleButtonTextOff: {
    color: "#954e62",
  },
});
