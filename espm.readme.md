ESPM Integration

ESPM Integration services are collected under three main files: 
- app/controllers/api/api.portfolio.server.controller.js
  Contains account related services and services that are being used during both import and export such as PMScore calculation

- app/controllers/api/api.portfolio.export.server.controller.js
  Contains two main methods:
    - pmExport 
      Creates a new property in ESPM using the selected buildee building
    - pmExportUpdate
      Updates the existing property in ESPM using the selected buildee building. It overwrites all the information there.
 
  General export procedure is explained below: 
    - Retrive building information from db and filter out the archived buildings.
    - Create espm property object using building information
    - Fill end uses
    - Fill utilities
    - Fill identifiers
    - Retrieve PM Score and update it on building
  All the operations above are done by different methods and these methods are used by both pmExport and pmExportUpdate if possible.

- app/controllers/api/api.portfolio.import.server.controller.js
  Contains two main methods:
    - pmImport 
      Creates a new building in buildee using the selected property of ESPM
    - pmImportUpdate
      Updates the existing building in buildee in ESPM using the selected property of ESPM. It overwrites all the information there.
 
  General export procedure is explained below: 
    - First check if there is any pending account/properties/meters and if so approve them.
      This is required because they will not be accessible until approved. 
    - Create buildee building object using property information
    - Fill end uses
    - Fill utilities
    - Fill identifiers
    - Retrieve PM Score and update it on building
  All the operations above are done by different methods and these methods are used by both pmImport and pmImportUpdate if possible.

Api calls of ESPM are collected under 6 different files for different categores of ESPM Web Services https://portfoliomanager.energystar.gov/webservices/home/api

- app/controllers/api/utils/api.portfolio.account.js
- app/controllers/api/utils/api.portfolio.connection.js
- app/controllers/api/utils/api.portfolio.meter.js
- app/controllers/api/utils/api.portfolio.property.js
- app/controllers/api/utils/api.portfolio.property.use.js
- app/controllers/api/utils/api.portfolio.reporting.js

These should be used when accessing to ESPM api and new services should only be added within these files. 

There are also some helper methods in app/controllers/api/utils/api.portfolio.util.js


Unit conversions

Currently we are saving units as they come from ESPM. Both value and unit is stored in the db.
This is because users would like to see the same units they are using in espm. However, for reporting and showing in overview screens of buildee some conversions may be needed. 
During export to espm a conversion is done in app/controllers/api/utils/api.portfolio.meter.js since espm is accepting values provided below. 

<xs:enumeration value="ccf (hundred cubic feet)"/>
<xs:enumeration value="cf (cubic feet)"/>
<xs:enumeration value="cGal (hundred gallons) (UK)"/>
<xs:enumeration value="cGal (hundred gallons) (US)"/>
<xs:enumeration value="Cubic Meters per Day"/>
<xs:enumeration value="cm (Cubic meters)"/>
<xs:enumeration value="Cords"/>
<xs:enumeration value="Gallons (UK)"/>
<xs:enumeration value="Gallons (US)"/>
<xs:enumeration value="GJ"/>
<xs:enumeration value="kBtu (thousand Btu)"/>
<xs:enumeration value="kcf (thousand cubic feet)"/>
<xs:enumeration value="Kcm (Thousand Cubic meters)"/>
<xs:enumeration value="KGal (thousand gallons) (UK)"/>
<xs:enumeration value="KGal (thousand gallons) (US)"/>
<xs:enumeration value="Kilogram"/>
<xs:enumeration value="KLbs. (thousand pounds)"/>
<xs:enumeration value="kWh (thousand Watt-hours)"/>
<xs:enumeration value="Liters"/>
<xs:enumeration value="MBtu (million Btu)"/>
<xs:enumeration value="MCF(million cubic feet)"/>
<xs:enumeration value="mg/l (milligrams per liter)"/>
<xs:enumeration value="MGal (million gallons) (UK)"/>
<xs:enumeration value="MGal (million gallons) (US)"/>
<xs:enumeration value="Million Gallons per Day"/>
<xs:enumeration value="MLbs. (million pounds)"/>
<xs:enumeration value="MWh (million Watt-hours)"/>
<xs:enumeration value="pounds"/>
<xs:enumeration value="Pounds per year"/>
<xs:enumeration value="therms"/>
<xs:enumeration value="ton hours"/>
<xs:enumeration value="Tonnes (metric)"/>
<xs:enumeration value="tons"/>