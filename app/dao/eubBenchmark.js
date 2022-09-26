const datawarehouseDb = require("../models/datawarehouse");

async function createEUBBenchmark(data) {
  try {
    if (data && data.building_id) {
      console.log(
        "-------------------Start Deleting old records from EUB Benchmark postgres database------------"
      );
      await datawarehouseDb.BuildingEUBBenchmark.destroy({
        where: {
          building_id: data.building_id
        }
      });
      console.log(
        "-------------------End Deleting old records from EUB Benchmark postgres database------------"
      );
    }
    console.log(
      "-------------------Start EUB Benchmark data pushed changed to postgres database------------"
    );
    let body = {
      building_id: data && data.building_id,
      created: Date.now(),
      "computing-energy-estimate__pct_elec":
        data &&
        data["computing-energy-estimate"] &&
        data["computing-energy-estimate"].pct_elec
          ? data["computing-energy-estimate"].pct_elec
          : 0,
      "computing-energy-estimate__pct_gas":
        data &&
        data["computing-energy-estimate"] &&
        data["computing-energy-estimate"].pct_gas
          ? data["computing-energy-estimate"].pct_gas
          : 0,
      "computing-energy-estimate__percentage":
        data &&
        data["computing-energy-estimate"] &&
        data["computing-energy-estimate"].percentage
          ? data["computing-energy-estimate"].percentage
          : 0,
      "cooking-energy-estimate__pct_elec":
        data &&
        data["cooking-energy-estimate"] &&
        data["cooking-energy-estimate"].pct_elec
          ? data["cooking-energy-estimate"].pct_elec
          : 0,
      "cooking-energy-estimate__pct_gas":
        data &&
        data["cooking-energy-estimate"] &&
        data["cooking-energy-estimate"].pct_gas
          ? data["cooking-energy-estimate"].pct_gas
          : 0,
      "cooking-energy-estimate__percentage":
        data &&
        data["cooking-energy-estimate"] &&
        data["cooking-energy-estimate"].percentage
          ? data["cooking-energy-estimate"].percentage
          : 0,
      "cooling-energy-estimate__pct_elec":
        data &&
        data["cooling-energy-estimate"] &&
        data["cooling-energy-estimate"].pct_elec
          ? data["cooling-energy-estimate"].pct_elec
          : 0,
      "cooling-energy-estimate__pct_gas":
        data &&
        data["cooling-energy-estimate"] &&
        data["cooling-energy-estimate"].pct_gas
          ? data["cooling-energy-estimate"].pct_gas
          : 0,
      "cooling-energy-estimate__percentage":
        data &&
        data["cooling-energy-estimate"] &&
        data["cooling-energy-estimate"].percentage
          ? data["cooling-energy-estimate"].percentage
          : 0,
      "dhw-energy-estimate__pct_elec":
        data &&
        data["dhw-energy-estimate"] &&
        data["dhw-energy-estimate"].pct_elec
          ? data["dhw-energy-estimate"].pct_elec
          : 0,
      "dhw-energy-estimate__pct_gas":
        data &&
        data["dhw-energy-estimate"] &&
        data["dhw-energy-estimate"].pct_gas
          ? data["dhw-energy-estimate"].pct_gas
          : 0,
      "dhw-energy-estimate__percentage":
        data &&
        data["dhw-energy-estimate"] &&
        data["dhw-energy-estimate"].percentage
          ? data["dhw-energy-estimate"].percentage
          : 0,
      "dishwasher-energy-estimate__pct_elec":
        data &&
        data["dishwasher-energy-estimate"] &&
        data["dishwasher-energy-estimate"].pct_elec
          ? data["dishwasher-energy-estimate"].pct_elec
          : 0,
      "dishwasher-energy-estimate__pct_gas":
        data &&
        data["dishwasher-energy-estimate"] &&
        data["dishwasher-energy-estimate"].pct_gas
          ? data["dishwasher-energy-estimate"].pct_gas
          : 0,
      "dishwasher-energy-estimate__percentage":
        data &&
        data["dishwasher-energy-estimate"] &&
        data["dishwasher-energy-estimate"].percentage
          ? data["dishwasher-energy-estimate"].percentage
          : 0,
      "fan-energy-estimate__pct_elec":
        data &&
        data["fan-energy-estimate"] &&
        data["fan-energy-estimate"].pct_elec
          ? data["fan-energy-estimate"].pct_elec
          : 0,
      "fan-energy-estimate__pct_gas":
        data &&
        data["fan-energy-estimate"] &&
        data["fan-energy-estimate"].pct_gas
          ? data["fan-energy-estimate"].pct_gas
          : 0,
      "fan-energy-estimate__percentage":
        data &&
        data["fan-energy-estimate"] &&
        data["fan-energy-estimate"].percentage
          ? data["fan-energy-estimate"].percentage
          : 0,
      "freezer-energy-estimate__pct_elec":
        data &&
        data["freezer-energy-estimate"] &&
        data["freezer-energy-estimate"].pct_elec
          ? data["freezer-energy-estimate"].pct_elec
          : 0,
      "freezer-energy-estimate__pct_gas":
        data &&
        data["freezer-energy-estimate"] &&
        data["freezer-energy-estimate"].pct_gas
          ? data["freezer-energy-estimate"].pct_gas
          : 0,
      "freezer-energy-estimate__percentage":
        data &&
        data["freezer-energy-estimate"] &&
        data["freezer-energy-estimate"].percentage
          ? data["freezer-energy-estimate"].percentage
          : 0,
      "heating-energy-estimate__pct_elec":
        data &&
        data["heating-energy-estimate"] &&
        data["heating-energy-estimate"].pct_elec
          ? data["heating-energy-estimate"].pct_elec
          : 0,
      "heating-energy-estimate__pct_gas":
        data &&
        data["heating-energy-estimate"] &&
        data["heating-energy-estimate"].pct_gas
          ? data["heating-energy-estimate"].pct_gas
          : 0,
      "heating-energy-estimate__percentage":
        data &&
        data["heating-energy-estimate"] &&
        data["heating-energy-estimate"].percentage
          ? data["heating-energy-estimate"].percentage
          : 0,
      "hw-energy-estimate__pct_elec":
        data &&
        data["hw-energy-estimate"] &&
        data["hw-energy-estimate"].pct_elec
          ? data["hw-energy-estimate"].pct_elec
          : 0,
      "hw-energy-estimate__pct_gas":
        data && data["hw-energy-estimate"] && data["hw-energy-estimate"].pct_gas
          ? data["hw-energy-estimate"].pct_gas
          : 0,
      "hw-energy-estimate__percentage":
        data &&
        data["hw-energy-estimate"] &&
        data["hw-energy-estimate"].percentage
          ? data["hw-energy-estimate"].percentage
          : 0,
      "laundry-energy-estimate__pct_elec":
        data &&
        data["laundry-energy-estimate"] &&
        data["laundry-energy-estimate"].pct_elec
          ? data["laundry-energy-estimate"].pct_elec
          : 0,
      "laundry-energy-estimate__pct_gas":
        data &&
        data["laundry-energy-estimate"] &&
        data["laundry-energy-estimate"].pct_gas
          ? data["laundry-energy-estimate"].pct_gas
          : 0,
      "laundry-energy-estimate__percentage":
        data &&
        data["laundry-energy-estimate"] &&
        data["laundry-energy-estimate"].percentage
          ? data["laundry-energy-estimate"].percentage
          : 0,
      "lighting-energy-estimate__pct_elec":
        data &&
        data["lighting-energy-estimate"] &&
        data["lighting-energy-estimate"].pct_elec
          ? data["lighting-energy-estimate"].pct_elec
          : 0,
      "lighting-energy-estimate__pct_gas":
        data &&
        data["lighting-energy-estimate"] &&
        data["lighting-energy-estimate"].pct_gas
          ? data["lighting-energy-estimate"].pct_gas
          : 0,
      "lighting-energy-estimate__percentage":
        data &&
        data["lighting-energy-estimate"] &&
        data["lighting-energy-estimate"].percentage
          ? data["lighting-energy-estimate"].percentage
          : 0,
      "microwave-energy-estimate__pct_elec":
        data &&
        data["microwave-energy-estimate"] &&
        data["microwave-energy-estimate"].pct_elec
          ? data["microwave-energy-estimate"].pct_elec
          : 0,
      "microwave-energy-estimate__pct_gas":
        data &&
        data["microwave-energy-estimate"] &&
        data["microwave-energy-estimate"].pct_gas
          ? data["microwave-energy-estimate"].pct_gas
          : 0,
      "microwave-energy-estimate__percentage":
        data &&
        data["microwave-energy-estimate"] &&
        data["microwave-energy-estimate"].percentage
          ? data["microwave-energy-estimate"].percentage
          : 0,
      "office-equipment-energy-estimate__pct_elec":
        data &&
        data["office-equipment-energy-estimate"] &&
        data["office-equipment-energy-estimate"].pct_elec
          ? data["office-equipment-energy-estimate"].pct_elec
          : 0,
      "office-equipment-energy-estimate__pct_gas":
        data &&
        data["office-equipment-energy-estimate"] &&
        data["office-equipment-energy-estimate"].pct_gas
          ? data["office-equipment-energy-estimate"].pct_gas
          : 0,
      "office-equipment-energy-estimate__percentage":
        data &&
        data["office-equipment-energy-estimate"] &&
        data["office-equipment-energy-estimate"].percentage
          ? data["office-equipment-energy-estimate"].percentage
          : 0,
      "other-energy-estimate__pct_elec":
        data &&
        data["other-energy-estimate"] &&
        data["other-energy-estimate"].pct_elec
          ? data["other-energy-estimate"].pct_elec
          : 0,
      "other-energy-estimate__pct_gas":
        data &&
        data["other-energy-estimate"] &&
        data["other-energy-estimate"].pct_gas
          ? data["other-energy-estimate"].pct_gas
          : 0,
      "other-energy-estimate__percentage":
        data &&
        data["other-energy-estimate"] &&
        data["other-energy-estimate"].percentage
          ? data["other-energy-estimate"].percentage
          : 0,
      "other-estimate__pct_elec":
        data && data["other-estimate"] && data["other-estimate"].pct_elec
          ? data["other-estimate"].pct_elec
          : 0,
      "other-estimate__pct_gas":
        data && data["other-estimate"] && data["other-estimate"].pct_gas
          ? data["other-estimate"].pct_gas
          : 0,
      "other-estimate__percentage":
        data && data["other-estimate"] && data["other-estimate"].percentage
          ? data["other-estimate"].percentage
          : 0,
      "pool-energy-estimate__pct_elec":
        data &&
        data["pool-energy-estimate"] &&
        data["pool-energy-estimate"].pct_elec
          ? data["pool-energy-estimate"].pct_elec
          : 0,
      "pool-energy-estimate__pct_gas":
        data &&
        data["pool-energy-estimate"] &&
        data["pool-energy-estimate"].pct_gas
          ? data["pool-energy-estimate"].pct_gas
          : 0,
      "pool-energy-estimate__percentage":
        data &&
        data["pool-energy-estimate"] &&
        data["pool-energy-estimate"].percentage
          ? data["pool-energy-estimate"].percentage
          : 0,
      "refrigeration-energy-estimate__pct_elec":
        data &&
        data["refrigeration-energy-estimate"] &&
        data["refrigeration-energy-estimate"].pct_elec
          ? data["refrigeration-energy-estimate"].pct_elec
          : 0,
      "refrigeration-energy-estimate__pct_gas":
        data &&
        data["refrigeration-energy-estimate"] &&
        data["refrigeration-energy-estimate"].pct_gas
          ? data["refrigeration-energy-estimate"].pct_gas
          : 0,
      "refrigeration-energy-estimate__percentage":
        data &&
        data["refrigeration-energy-estimate"] &&
        data["refrigeration-energy-estimate"].percentage
          ? data["refrigeration-energy-estimate"].percentage
          : 0,
      "tv-energy-estimate__pct_elec":
        data &&
        data["tv-energy-estimate"] &&
        data["tv-energy-estimate"].pct_elec
          ? data["tv-energy-estimate"].pct_elec
          : 0,
      "tv-energy-estimate__pct_gas":
        data && data["tv-energy-estimate"] && data["tv-energy-estimate"].pct_gas
          ? data["tv-energy-estimate"].pct_gas
          : 0,
      "tv-energy-estimate__percentage":
        data &&
        data["tv-energy-estimate"] &&
        data["tv-energy-estimate"].percentage
          ? data["tv-energy-estimate"].percentage
          : 0,
      "ventilation-estimate__pct_elec":
        data &&
        data["ventilation-estimate"] &&
        data["ventilation-estimate"].pct_elec
          ? data["ventilation-estimate"].pct_elec
          : 0,
      "ventilation-estimate__pct_gas":
        data &&
        data["ventilation-estimate"] &&
        data["ventilation-estimate"].pct_gas
          ? data["ventilation-estimate"].pct_gas
          : 0,
      "ventilation-estimate__percentage":
        data &&
        data["ventilation-estimate"] &&
        data["ventilation-estimate"].percentage
          ? data["ventilation-estimate"].percentage
          : 0
    };
    await datawarehouseDb.BuildingEUBBenchmark.create(body);
    console.log(
      "-------------------End EUB Benchmark data pushed changed to postgres database------------"
    );
  } catch (error) {
    console.log("error", error);
  }
}

module.exports = {
  createEUBBenchmark
};
