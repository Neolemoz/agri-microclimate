# Architecture Notes

## Included

- Expo mobile dashboard prototype from the root-level Agri app
- project metadata needed to run the dashboard locally

## Excluded

- `frontend/` because it contains the original game web client
- `src/` because it contains the original Java game backend
- build output, IDE files, and repo metadata

## Suggested Next Steps

1. Add sensor firmware sketches or MicroPython code under `firmware/`.
2. Add a small API or message bridge under `gateway/`.
3. Replace simulated data in `dashboard/App.js` with live telemetry.
