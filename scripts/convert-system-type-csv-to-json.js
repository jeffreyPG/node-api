const fs = require("fs");
const path = require("path");

const STATIC_FILE_DIR = path.resolve(__dirname + "/../static");
const OUTPUT_FILE_DIR = path.resolve(
  __dirname + "/../static/import/systemtype"
);

const args = process.argv.slice(2);

const filename = "systemtype.json";
const contents = fs.readFileSync(STATIC_FILE_DIR + "/" + filename);
const json = JSON.parse(contents);

const categorizationFilename = "equipmentcategorization.json";
const categorizationContents = fs.readFileSync(
  STATIC_FILE_DIR + "/" + categorizationFilename
);
const categorization = JSON.parse(categorizationContents);

const names = Array.from(new Set(json.map(row => row["System Name"]))).filter(
  name => name.length > 0
);

const initialValues = names.reduce((acc, name) => {
  return {
    ...acc,
    [name]: { name, sections: [], projects: [], imageUrls: [] }
  };
}, {});

const getCategoryValue = displayName => {
  const match = categorization.find(
    c => c.category && c.category.displayName === displayName
  );
  if (!match) {
    console.log("NO MATCH FOR CATEGORY", displayName);
    return null;
  }
  return match.category.value;
};

const getApplicationValue = displayName => {
  const match = categorization.find(
    c => c.application && c.application.displayName === displayName
  );
  if (!match) {
    console.log("NO MATCH FOR APPLICATION", displayName);
    return null;
  }
  return match.application.value;
};

const getTechnologyValue = displayName => {
  const normalizedDisplayName =
    (displayName && displayName.replace("\r", "")) || null;
  const match = categorization.find(
    c => c.technology && c.technology.displayName === normalizedDisplayName
  );

  if (!match) {
    console.log("NO MATCH FOR TECHNOLOGY", displayName);
    return null;
  }
  return match.technology.value;
};

const merged = json
  .filter(row => {
    return row["System Name"].length > 0;
  })
  .map(row => ({
    name: row["System Name"],
    section: row["Section Name"],
    systemOrder: row["System Order"],
    sectionOrder: row["Section Order"],
    category: row.Category,
    application: row.Application,
    technology: row["Technology\r"] || row.Technology
  }))
  .reduce((acc, row) => {
    const section = {
      name: row.section,
      category: getCategoryValue(row.category),
      application: getApplicationValue(row.application),
      technology: getTechnologyValue(row.technology),
      order: row.sectionOrder
    };

    if (!section.category) return acc;

    return {
      ...acc,
      [row.name]: {
        ...acc[row.name],
        order: row.systemOrder,
        sections: acc[row.name].sections.concat(section)
      }
    };
  }, initialValues);

const systemtypes = Object.values(merged);

fs.writeFileSync(
  `${OUTPUT_FILE_DIR}/${Date.now().toString()}.json`,
  JSON.stringify(systemtypes)
);
