# EcoFlow Power Supply Calculations

## 1. Daily Energy Consumption

For each device:

```
Device Watts × Hours Used = Watt-hours (Wh)
```

| Device | Watts | Hours | Wh |
|--------|-------|-------|----|
| Laptop | 100 W | 5 h | 500 Wh |
| Microwave | 1200 W | 0.5 h | 600 Wh |
| **Total** | | | **1100 Wh** |

## 2. Runtime on EcoFlow

```
Runtime (hours) ≈ (Power Station Capacity × 0.85) ÷ Total Device Watts
```

- **0.85** = inverter efficiency factor (AC output)
- DC outputs (USB/12V) may yield longer runtime (no inverter loss)

**Example:** EcoFlow DELTA 2 (1024 Wh) running a 100 W load:

```
(1024 × 0.85) ÷ 100 ≈ 8.7 hours
```

## 3. Solar Recharge Time

```
Charge Time (hours) ≈ (Battery Capacity ÷ Solar Panel Watts) × 1.15–1.25
```

- **1.15–1.25** = real-world efficiency derate (sun angle, panel temp, controller loss)

**Example:** DELTA Pro (3600 Wh) with a 400 W panel:

```
(3600 ÷ 400) × 1.2 ≈ 10.8 hours
```

## 4. Peak Power Check

| Parameter | Limit |
|-----------|-------|
| Continuous AC output | Must exceed sum of all running watts |
| Surge (startup) | Motors/compressors can spike to 2–3× running watts |

> ⚠️ Ensure total simultaneous watts stay **below** the station's continuous output rating.

## Quick Checklist

- [ ] List all devices + their wattage
- [ ] Multiply watts × hours → total Wh
- [ ] Divide total Wh by (capacity × 0.85) → runtime
- [ ] Verify total watts < continuous output limit
