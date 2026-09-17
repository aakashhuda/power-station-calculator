/* Power Station Calculator — bundled product catalog.
 * Extracted from portable_power_stations.json (Star Tech Bangladesh, 2026-09-17).
 * Only the fields the calculator needs are kept. Picking a model prefills every
 * station field; a spec the source listing does not state is simply absent here,
 * so that field is left for the user to fill in.
 * Loaded before app.js; exposes window.PSC_CATALOG. Do not edit by hand.
 */

window.PSC_CATALOG = {
  source: "Star Tech Bangladesh",
  collected: "2026-09-17",
  brands: [
    {
      name: "Anker",
      products: [
        {"id":"anker-solix-c1000-gen-2","model":"SOLIX C1000 Gen 2","full":"Anker SOLIX C1000 Gen 2 2000W Portable Power Station","capacityWh":1024,"outputW":2000,"peakW":3000,"acInputW":1200,"solarInputW":600,"price":82500,"chemistry":"LiFePO4"},
        {"id":"anker-solix-c2000-gen-2","model":"SOLIX C2000 Gen 2","full":"Anker SOLIX C2000 Gen 2 2400W Portable Power Station","capacityWh":2048,"outputW":2400,"peakW":4000,"acInputW":1800,"solarInputW":800,"stock":"Up Coming","chemistry":"LiFePO4"},
        {"id":"anker-solix-c300","model":"SOLIX C300","full":"Anker SOLIX C300 300W Portable Power Station","capacityWh":288,"outputW":300,"peakW":600,"acInputW":330,"solarInputW":100,"stock":"Out Of Stock","chemistry":"LiFePO4"}
      ]
    },
    {
      name: "EcoFlow",
      products: [
        {"id":"ecoflow-river-2","model":"RIVER 2","full":"EcoFlow RIVER 2 Portable Power Station","capacityWh":256,"outputW":300,"peakW":600,"acInputW":360,"solarInputW":110,"price":24300,"chemistry":"LiFePO4"},
        {"id":"ecoflow-river-3","model":"RIVER 3","full":"EcoFlow RIVER 3 Portable Power Station","capacityWh":245,"outputW":300,"peakW":600,"acInputW":320,"solarInputW":110,"price":24500,"chemistry":"LiFePO4"},
        {"id":"ecoflow-river-2-max","model":"RIVER 2 Max","full":"Ecoflow River 2 Max Portable Power Station","capacityWh":512,"outputW":500,"peakW":1000,"acInputW":660,"solarInputW":220,"price":43600,"chemistry":"LiFePO4"},
        {"id":"ecoflow-river-2-pro","model":"RIVER 2 Pro","full":"EcoFlow RIVER 2 Pro Portable Power Station","capacityWh":768,"outputW":800,"peakW":1600,"acInputW":940,"solarInputW":220,"price":49890,"chemistry":"LiFePO4"},
        {"id":"ecoflow-delta-3-air-1000","model":"DELTA 3 Air 1000","full":"EcoFlow Delta 3 Air 1000 Portable Power Station","capacityWh":960,"outputW":500,"peakW":1000,"acInputW":500,"solarInputW":500,"price":52200,"chemistry":"LiFePO4"},
        {"id":"ecoflow-delta-3","model":"DELTA 3","full":"Ecoflow Delta 3 Portable Power Station","capacityWh":1024,"outputW":1800,"peakW":2400,"acInputW":1500,"solarInputW":500,"price":73900,"chemistry":"LiFePO4"},
        {"id":"ecoflow-delta-3-air-2000","model":"DELTA 3 Air 2000","full":"EcoFlow Delta 3 Air 2000 Portable Power Station","capacityWh":1920,"outputW":1000,"peakW":1500,"acInputW":1000,"solarInputW":1000,"price":90250,"chemistry":"LiFePO4"},
        {"id":"ecoflow-delta-3-max","model":"DELTA 3 Max","full":"Ecoflow Delta 3 Max Portable Power Station","capacityWh":2048,"outputW":2400,"peakW":3400,"acInputW":2300,"solarInputW":500,"price":117000,"chemistry":"LiFePO4"},
        {"id":"ecoflow-delta-pro","model":"DELTA Pro","full":"EcoFlow DELTA Pro Portable Power Station","capacityWh":3600,"outputW":3600,"peakW":4500,"acInputW":1800,"solarInputW":1600,"price":224000,"chemistry":"LiFePO4"},
        {"id":"ecoflow-delta-pro-3","model":"DELTA Pro 3","full":"Ecoflow Delta Pro 3 Portable Power Station","capacityWh":4096,"outputW":4000,"peakW":6000,"acInputW":2900,"solarInputW":2600,"price":420990,"chemistry":"LiFePO4"},
        {"id":"ecoflow-delta-pro-ultra","model":"DELTA Pro Ultra","full":"EcoFlow DELTA Pro Ultra Portable Power Station","capacityWh":6144,"outputW":7200,"acInputW":3000,"solarInputW":5600,"price":610490,"chemistry":"LiFePO4"},
        {"id":"ecoflow-river-3-plus","model":"RIVER 3 Plus","full":"EcoFlow RIVER 3 Plus Portable Power Station","capacityWh":286,"outputW":600,"peakW":1200,"acInputW":360,"solarInputW":220,"price":34900,"stock":"Out Of Stock","chemistry":"LiFePO4"},
        {"id":"ecoflow-e980","model":"E980","full":"EcoFlow E980 Portable Power Station","capacityWh":980,"outputW":500,"peakW":650,"acInputW":650,"solarInputW":500,"stock":"Out Of Stock","chemistry":"LiFePO4"},
        {"id":"ecoflow-river-3-max-plus","model":"RIVER 3 Max Plus","full":"EcoFlow RIVER 3 Max Plus Portable Power Station","capacityWh":858,"outputW":600,"peakW":1200,"acInputW":360,"solarInputW":220,"stock":"Out Of Stock","chemistry":"LiFePO4"},
        {"id":"ecoflow-delta-2","model":"DELTA 2","full":"Ecoflow Delta 2 Portable Power Station","capacityWh":1024,"outputW":1800,"peakW":2400,"acInputW":1200,"solarInputW":500,"stock":"Out Of Stock","chemistry":"LiFePO4"},
        {"id":"ecoflow-e2000","model":"E2000","full":"EcoFlow E2000 Portable Power Station","capacityWh":2016,"outputW":2400,"peakW":3400,"acInputW":2000,"solarInputW":800,"price":106890,"stock":"Out Of Stock","chemistry":"LiFePO4"},
        {"id":"ecoflow-delta-2-max","model":"DELTA 2 Max","full":"Ecoflow Delta 2 Max Portable Power Station","capacityWh":2016,"outputW":2400,"peakW":3400,"acInputW":1800,"solarInputW":1000,"stock":"Out Of Stock","chemistry":"LiFePO4"}
      ]
    },
    {
      name: "Marsriva",
      products: [
        {"id":"marsriva-mp3s","model":"MP3S","full":"Marsriva MP3S 300W Portable Power Station","capacityWh":268.8,"outputW":300,"acInputW":90,"price":17250,"chemistry":"LiFePO4"},
        {"id":"marsriva-mp6-plus","model":"MP6 Plus","full":"Marsriva MP6 Plus 600W Portable Power Station","capacityWh":512,"outputW":600,"peakW":1200,"acInputW":600,"solarInputW":300,"price":40000,"chemistry":"LiFePO4"},
        {"id":"marsriva-mp10","model":"MP10","full":"Marsriva MP10 1000W Portable Power Station","capacityWh":1176,"outputW":1000,"peakW":2000,"acInputW":800,"solarInputW":200,"price":55500,"chemistry":"LiFePO4"},
        {"id":"marsriva-mp6-pro","model":"MP6 Pro","full":"Marsriva MP6 Pro 600W Portable Power Station","capacityWh":627.2,"outputW":600,"peakW":1200,"acInputW":300,"solarInputW":200,"stock":"Out Of Stock"}
      ]
    },
    {
      name: "Hithium",
      products: [
        {"id":"hithium-heroee-1","model":"HeroEE 1","full":"Hithium HeroEE 1 1kWh Portable Power Station","capacityWh":1004.8,"outputW":200,"peakW":400,"acInputW":200,"solarInputW":200,"price":27990,"chemistry":"LiFePO4"},
        {"id":"hithium-heroee-maxpower-8-aio","model":"HeroEE MaxPower 8 AIO","full":"Hithium HeroEE MaxPower 8 AIO 5kW Portable Power Station","capacityWh":8038.4,"outputW":5000,"acInputW":5000,"solarInputW":9000,"price":262000,"chemistry":"LiFePO4"},
        {"id":"hithium-heroee-light-1","model":"HeroEE Light 1","full":"Hithium HeroEE Light 1 500W Portable Power Station","capacityWh":1004.8,"outputW":500,"peakW":800,"acInputW":500,"solarInputW":300,"stock":"Out Of Stock","chemistry":"LiFePO4"},
        {"id":"hithium-heroee-2","model":"HeroEE 2","full":"Hithium HeroEE 2 2kWh Portable Power Station","capacityWh":2009.6,"outputW":1000,"acInputW":1000,"solarInputW":450,"stock":"Out Of Stock","chemistry":"LiFePO4"}
      ]
    },
    {
      name: "Oraimo",
      products: [
        {"id":"oraimo-energy-kili","model":"Energy KILI","full":"Oraimo Energy KILI 500W Portable Power Station (OPS-5102)","capacityWh":1004.8,"outputW":500,"acInputW":1000,"solarInputW":400,"price":39990,"stock":"Out Of Stock","chemistry":"LiFePO4"}
      ]
    },
    {
      name: "Bluetti",
      products: [
        {"id":"bluetti-premium-30-v2","model":"Premium 30 V2","full":"BLUETTI Premium 30 V2 600W Portable Power Station","capacityWh":320,"outputW":600,"peakW":1500,"acInputW":980,"solarInputW":200,"price":29900,"stock":"Out Of Stock"},
        {"id":"bluetti-premium-100-v2","model":"Premium 100 V2","full":"BLUETTI Premium 100 V2 2000W Portable Power Station","capacityWh":1024,"outputW":2000,"peakW":2700,"acInputW":2300,"solarInputW":1000,"price":73600},
        {"id":"bluetti-premium-150-ac180p","model":"Premium 150 AC180P","full":"BLUETTI Premium 150 AC180P 1800W Portable Power Station","capacityWh":1440,"outputW":1800,"peakW":2700,"acInputW":1440,"solarInputW":500,"stock":"Out Of Stock"},
        {"id":"bluetti-premium-200-v2","model":"Premium 200 V2","full":"BLUETTI Premium 200 V2 2700W Portable Power Station","capacityWh":2073.6,"outputW":2700,"acInputW":2300,"solarInputW":1000,"stock":"Out Of Stock","chemistry":"LiFePO4"}
      ]
    },
    {
      name: "EcoSONIC",
      products: [
        {"id":"ecosonic-sl82-l2","model":"SL82-L2","full":"EcoSONIC SL82-L2 300W Portable Power Station With Solar Panel","capacityWh":230,"outputW":300,"acInputW":200,"solarInputW":200,"price":13310,"chemistry":"LiFePO4"},
        {"id":"ecosonic-ap-500","model":"AP-500","full":"EcoSONIC AP-500 500W Portable Power Station With Solar Panel","capacityWh":537.6,"outputW":500,"acInputW":200,"solarInputW":200,"price":26070,"chemistry":"LiFePO4"},
        {"id":"ecosonic-sl63-l2","model":"SL63-L2","full":"EcoSONIC SL63-L2 800W Portable Power Station With Solar Panel","capacityWh":768,"outputW":800,"acInputW":200,"solarInputW":200,"price":42999,"chemistry":"LiFePO4"},
        {"id":"ecosonic-ap-1500","model":"AP-1500","full":"EcoSONIC AP-1500 1500W Portable Power Station With Solar Panel","capacityWh":1484.8,"outputW":1500,"acInputW":584,"solarInputW":450,"price":88550,"chemistry":"LiFePO4"},
        {"id":"ecosonic-ap-3500","model":"AP-3500","full":"EcoSONIC AP-3500 3500W Portable Power Station","capacityWh":3840,"outputW":3500,"acInputW":584,"solarInputW":1200,"stock":"Out Of Stock","chemistry":"LiFePO4"}
      ]
    }
  ]
};
