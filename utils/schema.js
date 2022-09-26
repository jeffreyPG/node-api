const fs = require("fs");
const path = require("path");

module.exports.loadTypeSchema = async type => {
  const pathToType = path.join(process.cwd(), `app/types/${type}`);
  try {
    const { schema } = require(`${pathToType}/${type}.nexus`);
    return schema();
  } catch (err) {
    // only equipment is using nexus for now
    if (type === "equipment") {
      console.error(err);
    }
    return fs.readFileSync(`${pathToType}/${type}.gql`, { encoding: "utf-8" });
  }
};
