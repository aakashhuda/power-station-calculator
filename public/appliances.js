/* Power Station Calculator — appliance wattage reference.
 *
 * Used to suggest a wattage when someone knows which devices they want to back up
 * but not what they draw. Picking a name in the Device field fills the Watts cell
 * and marks it as a typical figure; typing any value replaces it.
 *
 * To add an appliance, append an entry:
 *
 *   { id: 'water-pump', name: 'Water pump', watts: 750, min: 500, max: 1100 }
 *
 *   id     unique slug (only used to tell entries apart)
 *   name   what the user sees and picks; also what gets typed into Device
 *   watts  the value that fills the Watts cell — the EXPECTED draw, not the label
 *   min    lowest realistic nameplate rating, shown in the tooltip
 *   max    highest realistic nameplate rating, shown in the tooltip
 *   note   optional extra sentence shown in the tooltip
 *
 * `watts` is deliberately not always the midpoint of min..max. Where a device's
 * label overstates what it actually draws, or where it only draws part of the
 * time, `watts` reflects the expected load so runtimes are not overstated.
 */

window.PSC_APPLIANCES = [
  { id: 'led-bulb', name: 'LED bulb', watts: 15, min: 9, max: 15 },
  { id: 'tube-light', name: 'Tube light', watts: 27, min: 18, max: 36 },
  { id: 'ceiling-fan', name: 'Ceiling fan', watts: 100, min: 60, max: 75 },
  { id: 'table-fan', name: 'Table / pedestal fan', watts: 50, min: 40, max: 60 },
  { id: 'wifi-router', name: 'WiFi router', watts: 10, min: 5, max: 15 },
  {
    id: 'phone-charger',
    name: 'Phone charger',
    watts: 15,
    min: 5,
    max: 45,
    note: 'A phone draws its own charging rate, not the charger rating, so 15 W is typical even with a 45 W charger.'
  },
  { id: 'laptop', name: 'Laptop', watts: 65, min: 45, max: 90 },
  { id: 'tv', name: 'TV', watts: 150, min: 60, max: 150 },
  {
    id: 'refrigerator',
    name: 'Refrigerator',
    watts: 400,
    min: 100,
    max: 200,
    note: 'The compressor runs about a third of the time, so enter fewer hours rather than a lower wattage.'
  }
];
