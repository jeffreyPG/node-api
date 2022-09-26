const commonSpaceTypes = [
  { value: "food-service", name: "Food Service" },
  { value: "parking", name: "Parking" },
  { value: "restroom", name: "Restroom" },
  { value: "office-work-area", name: "Office work area" },
  { value: "non-office-work-area", name: "Non-office work area" },
  { value: "reception-area", name: "Reception area" },
  { value: "waiting-area", name: "Waiting area" },
  { value: "lobby", name: "Lobby" },
  { value: "conference-room", name: "Conference room" },
  { value: "kitchenette", name: "Kitchenette" },
  { value: "janitorial-closet", name: "Janitorial closet" },
  { value: "corridor", name: "Corridor" },
  { value: "deck", name: "Deck" },
  { value: "courtyard", name: "Courtyard" },
  { value: "atrium", name: "Atrium" },
  { value: "other", name: "Other" },
  { value: "unknown", name: "Unknown" },
  { value: "it-room", name: "IT Room" },
  { value: "elevator", name: "Elevator" },
  { value: "stair", name: "Stair" },
  { value: "security-room", name: "Security Room" },
  { value: "vestibule", name: "Vestibule" },
  { value: "break-room", name: "Break Room" }
];

function getSpaceTypeByUseType(useType) {
  switch (useType) {
    case "adult-education":
      return [
        { value: "computer-lab", name: "Computer Lab" },
        { value: "auditorium", name: "Auditorium" },
        { value: "classroom", name: "Classroom" },
        { value: "media-center", name: "Media Center" },
        { value: "common-area", name: "Common Area" },
        { value: "reception-area", name: "Reception Area" },
        { value: "waiting-area", name: "Waiting Area" },
        {
          value: "transportation-waiting-area",
          name: "Transportation Waiting Area"
        },
        { value: "printing-room", name: "Printing Room" }
      ];

    case "aquarium":
      return [
        { value: "vivarium", name: "Vivarium" },
        { value: "common-area", name: "Common Area" },
        { value: "reception-area", name: "Reception Area" },
        { value: "waiting-area", name: "Waiting Area" },
        {
          value: "transportation-waiting-area",
          name: "Transportation Waiting Area"
        }
      ];

    case "automobile-dealership":
      return [
        { value: "open-parking-lot", name: "Open Parking Lot" },
        {
          value: "partially-enclosed-parking-garage",
          name: "Partially Enclosed Parking Garage"
        },
        { value: "enclosed-parking-garage", name: "Enclosed Parking Garage" }
      ];

    case "bank-branch":
      return [
        { value: "teller-area", name: "Teller Area" },
        { value: "vault", name: "Vault" },
        { value: "drive-thru", name: "Drive-Thru" },
        { value: "closed-office", name: "Closed Office" },
        { value: "open-office", name: "Open Office" }
      ];

    case "bar":
      return [
        { value: "point-of-sale", name: "Point of Sale" },
        { value: "dry-storage", name: "Dry Storage" },
        { value: "dance-floor", name: "Dance Floor" },
        { value: "bar", name: "Bar" },
        { value: "dining-area", name: "Dining Area" }
      ];

    case "barracks":
      return [
        { value: "dining-area", name: "Dining Area" },
        { value: "living-area", name: "Living Area" },
        { value: "sleeping-area", name: "Sleeping Area" },
        { value: "laundry-area", name: "Laundry Area" },
        { value: "lodging-area", name: "Lodging Area" },
        { value: "dressing-area", name: "Dressing Area" }
      ];

    case "bowling-alley":
      return [
        { value: "point-of-sale", name: "Point of Sale" },
        { value: "dry-storage", name: "Dry Storage" },
        { value: "dance-floor", name: "Dance Floor" },
        { value: "bar", name: "Bar" },
        { value: "dining-area", name: "Dining Area" },
        { value: "lanes", name: "Lanes" }
      ];

    case "casino":
      return [
        { value: "point-of-sale", name: "Point of Sale" },
        { value: "dry-storage", name: "Dry Storage" },
        { value: "dance-floor", name: "Dance Floor" },
        { value: "bar", name: "Bar" },
        { value: "dining-area", name: "Dining Area" },
        { value: "security-room", name: "Security Room" },
        { value: "vault", name: "Vault" },
        { value: "stage", name: "Stage" },
        { value: "gambling-tables", name: "Gambling Tables" }
      ];

    case "college":
      return [
        { value: "computer-lab", name: "Computer Lab" },
        { value: "auditorium", name: "Auditorium" },
        { value: "classroom", name: "Classroom" },
        { value: "media-center", name: "Media Center" },
        { value: "common-area", name: "Common Area" },
        { value: "reception-area", name: "Reception Area" },
        { value: "waiting-area", name: "Waiting Area" },
        {
          value: "transportation-waiting-area",
          name: "Transportation Waiting Area"
        },
        { value: "printing-room", name: "Printing Room" },
        { value: "laboratory", name: "Laboratory" },
        { value: "stage", name: "Stage" },
        { value: "spectator-area", name: "Spectator Area" },
        { value: "lecture-hall", name: "Lecture Hall" },
        { value: "data-center", name: "Data Center" },
        { value: "security-room", name: "Security Room" },
        { value: "shipping-and-receiving", name: "Shipping and Receiving" }
      ];

    case "convenience-store-gas":
      return [
        { value: "retail-area", name: "Retail Area" },
        { value: "service-repair-area", name: "Service/Repair Area" },
        { value: "fuel-pump-area", name: "Fuel Pump Area" },
        { value: "point-of-sale", name: "Point of Sale" }
      ];

    case "convenience-store":
      return [
        { value: "retail-area", name: "Retail Area" },
        { value: "deli", name: "Deli" },
        { value: "point-of-sale", name: "Point of Sale" }
      ];

    case "convention-center":
      return [
        { value: "auditorium", name: "Auditorium" },
        { value: "classroom", name: "Classroom" },
        { value: "media-center", name: "Media Center" },
        { value: "common-area", name: "Common Area" },
        { value: "reception-area", name: "Reception Area" },
        { value: "waiting-area", name: "Waiting Area" },
        {
          value: "transportation-waiting-area",
          name: "Transportation Waiting Area"
        }
      ];

    case "courthouse":
      return [{ value: "courtroom", name: "Courtroom" }];

    case "data-center":
      return [{ value: "data-center", name: "Data Center" }];

    case "distribution-center":
      return [
        { value: "shipping-and-receiving", name: "Shipping and Receiving" },
        { value: "refrigerated-storage", name: "Refrigerated Storage" },
        { value: "non-refrigerated-storage", name: "Non-Refrigerated Storage" }
      ];

    case "water-treatment":
      return [
        { value: "chemical-storage-room", name: "Chemical Storage Room" },
        {
          value: "non-chemical-storage-room",
          name: "Non-Chemical Storage Room"
        },
        { value: "storage", name: "Storage" }
      ];

    case "enclosed-mall":
      return [
        { value: "retail-area", name: "Retail Area" },
        { value: "deli", name: "Deli" },
        { value: "point-of-sale", name: "Point of Sale" },
        { value: "dry-storage", name: "Dry Storage" },
        { value: "dining-area", name: "Dining Area" },
        { value: "hypermarket", name: "Hypermarket" }
      ];

    case "energy-station":
      return [
        { value: "shipping-and-receiving", name: "Shipping and Receiving" }
      ];

    case "fast-food":
      return [
        { value: "point-of-sale", name: "Kitchen" },
        { value: "point-of-sale", name: "Point of Sale" },
        { value: "dry-storage", name: "Dry Storage" },
        { value: "dining-area", name: "Dining Area" }
      ];

    case "financial-office":
      return [
        { value: "closed-office", name: "Closed Office" },
        { value: "open-office", name: "Open Office" },
        { value: "printing-room", name: "Printing Room" },
        { value: "media-center", name: "Media Center" },
        { value: "telephone-data-entry", name: "Telephone Data Entry" }
      ];

    case "fire-station":
      return [
        { value: "sleeping-area", name: "Sleeping Area" },
        { value: "laundry-area", name: "Laundry Area" },
        { value: "lodging-area", name: "Lodging Area" },
        { value: "dressing-area", name: "Dressing Area" }
      ];

    case "fitness-center":
      return [
        { value: "day-room", name: "Day Room" },
        { value: "sport-play-area", name: "Sport Play Area" },
        { value: "dressing-area", name: "Dressing Area" },
        { value: "laundry-area", name: "Laundry Area" }
      ];

    case "food-sales":
      return [
        { value: "retail-area", name: "Retail Area" },
        { value: "deli", name: "Deli" },
        { value: "point-of-sale", name: "Point of Sale" },
        { value: "dry-storage", name: "Dry Storage" },
        { value: "produce", name: "Produce" },
        { value: "bakery", name: "Bakery" },
        { value: "dining-area", name: "Dining Area" }
      ];

    case "food-services":
      return [
        { value: "retail-area", name: "Retail Area" },
        { value: "deli", name: "Deli" },
        { value: "point-of-sale", name: "Point of Sale" },
        { value: "dry-storage", name: "Dry Storage" },
        { value: "produce", name: "Produce" },
        { value: "bakery", name: "Bakery" },
        { value: "dining-area", name: "Dining Area" },
        { value: "kitchen", name: "Kitchen" }
      ];

    case "hospital":
      return [
        { value: "common-area", name: "Common Area" },
        { value: "reception-area", name: "Reception Area" },
        { value: "waiting-area", name: "Waiting Area" },
        { value: "exam-room", name: "Exam Room" },
        { value: "patient-room", name: "Patient Room" },
        { value: "physical-therapy-area", name: "Physical Therapy Area" },
        { value: "radiology", name: "Radiology" },
        { value: "lab", name: "Lab" },
        { value: "anesthesia", name: "Anesthesia" },
        { value: "biohazard", name: "BioHazard" },
        { value: "clean-work-area", name: "Clean Work Area" },
        { value: "kitchen-area", name: "Kitchen Area" },
        {
          value: "food-service-institutional",
          name: "Food Service-Institutional"
        },
        { value: "locker-room", name: "Locker Room" },
        { value: "medical-gas-area", name: "Medical Gas Area" },
        { value: "dressing-room", name: "Dressing Room" },
        { value: "lounge-area", name: "Lounge Area" },
        { value: "pacu", name: "PACU" },
        { value: "operating-room", name: "Operating Room" },
        { value: "pre-op-area", name: "Pre-Op Area" },
        { value: "nurse-station", name: "Nurse Station" },
        { value: "soil-work", name: "Soil Work" },
        { value: "procedure-room", name: "Procedure Room" },
        { value: "icu-patient-room", name: "ICU Patient Room" },
        { value: "icu-nurse-station", name: "ICU Nurse Station" },
        { value: "icu-open-area", name: "ICU Open Area" },
        { value: "er-nurse-station", name: "ER Nurse Station" },
        { value: "er-trauma", name: "ER Trauma" },
        { value: "er-triage", name: "ER Triage" },
        { value: "er-exam-room", name: "ER Exam Room" },
        { value: "dining-area", name: "Dining Area" },
        { value: "xray", name: "Xray" },
        { value: "mri", name: "MRI" }
      ];

    case "hotel":
      return [
        { value: "guestroom", name: "Guestroom" },
        { value: "laundry-area", name: "Laundry Area" }
      ];

    case "ice-rink":
      return [
        { value: "sport-play-area", name: "Sport Play Area" },
        { value: "spectator-area", name: "Spectator Area" },
        { value: "retail-area", name: "Retail Area" },
        { value: "point-of-sale", name: "Point of Sale" }
      ];

    case "indoor-arena":
      return [
        { value: "sport-play-area", name: "Sport Play Area" },
        { value: "spectator-area", name: "Spectator Area" },
        { value: "retail-area", name: "Retail Area" },
        { value: "point-of-sale", name: "Point of Sale" }
      ];

    case "school":
      return [
        { value: "computer-lab", name: "Computer Lab" },
        { value: "auditorium", name: "Auditorium" },
        { value: "classroom", name: "Classroom" },
        { value: "media-center", name: "Media center" },
        { value: "common-area", name: "Common Area" },
        { value: "reception-area", name: "Reception Area" },
        { value: "waiting-area", name: "Waiting Area" },
        {
          value: "transportation-waiting-area",
          name: "Transportation waiting Area"
        },
        { value: "printing-room", name: "Printing Room" },
        { value: "laboratory", name: "Laboratory" },
        { value: "stage", name: "Stage" },
        { value: "spectator-area", name: "Spectator Area" },
        { value: "lecture-hall", name: "Lecture Hall" },
        { value: "data-center", name: "Data Center" },
        { value: "security-room", name: "Security Room" },
        { value: "shipping-and-receiving", name: "Shipping and Receiving" }
      ];

    case "laboratory":
      return [
        { value: "chemical-storage-room", name: "Chemical Storage Room" },
        {
          value: "non-chemical-storage-room",
          name: "Non-Chemical Storage Room"
        },
        { value: "clean-work-area", name: "Clean Work Area" },
        { value: "data-center", name: "Data Center" },
        { value: "high-bay-work-area", name: "High Bay Work Area" },
        { value: "lab-area", name: "Lab Area" }
      ];

    case "library":
      return [
        { value: "stacks", name: "Stacks" },
        { value: "computer-lab", name: "Computer Lab" },
        { value: "printing-room", name: "Printing Room" },
        { value: "classroom", name: "Classroom" },
        { value: "media-center", name: "Media Center" }
      ];

    case "lifestyle-center":
      return [
        { value: "day-room", name: "Day Room" },
        { value: "computer-lab", name: "Computer Lab" },
        { value: "printing-room", name: "Printing Room" },
        { value: "classroom", name: "Classroom" },
        { value: "media-center", name: "Media Center" }
      ];

    case "mailing-center":
      return [
        { value: "shipping-and-receiving", name: "Shipping and Receiving" }
      ];

    case "manufacturing-plant":
      return [
        { value: "shipping-and-receiving", name: "Shipping and Receiving" },
        { value: "chemical-storage-room", name: "Chemical Storage Room" },
        {
          value: "non-chemical-storage-room",
          name: "Non-Chemical Storage Room"
        }
      ];

    case "medical-office":
      return [
        { value: "common-area", name: "Common Area" },
        { value: "reception-area", name: "Reception Area" },
        { value: "waiting-area", name: "Waiting Area" },
        { value: "exam-room", name: "Exam Room" },
        { value: "patient-room", name: "Patient Room" },
        { value: "physical-therapy-area", name: "Physical Therapy Area" },
        { value: "radiology", name: "Radiology" },
        { value: "lab", name: "Lab" },
        { value: "anesthesia", name: "Anesthesia" },
        { value: "biohazard", name: "BioHazard" },
        { value: "clean-work-area", name: "Clean Work Area" },
        { value: "nurse-station", name: "Nurse Station" },
        { value: "dining-area", name: "Dining Area" },
        { value: "xray", name: "Xray" },
        { value: "mri", name: "MRI" }
      ];

    case "microbreweries":
      return [
        { value: "shipping-and-receiving", name: "Shipping and Receiving" },
        { value: "refrigerated-storage", name: "Refrigerated Storage" },
        { value: "non-refrigerated-storage", name: "Non-Refrigerated Storage" },
        { value: "retail-area", name: "Retail Area" },
        { value: "dry-storage", name: "Dry Storage" },
        { value: "bar-area", name: "Bar Area" }
      ];

    case "mixed-use":
      return [
        { value: "basement", name: "Basement" },
        { value: "dining-area", name: "Dining Area" },
        { value: "living-area", name: "Living Area" },
        { value: "sleeping-area", name: "Sleeping Area" },
        { value: "laundry-area", name: "Laundry Area" },
        { value: "common-area", name: "Common Area" },
        { value: "reception-area", name: "Reception Area" },
        { value: "waiting-area", name: "Waiting Area" },
        { value: "shipping-and-receiving", name: "Shipping and Receiving" },
        { value: "retail-area", name: "Retail Area" },
        { value: "food-service-full", name: "Food Service-Full" },
        { value: "food-service-limited", name: "Food Service-Limited" },
        { value: "kitchen-area", name: "Kitchen Area" }
      ];

    case "movie-theater":
      return [
        { value: "retail-area", name: "Retail Area" },
        { value: "food-service-fast", name: "Food Service-Fast" },
        { value: "food-service-limited", name: "Food Service-Limited" },
        { value: "theater", name: "Theater" }
      ];

    case "multifamily-housing":
      return [
        { value: "basement", name: "Basement" },
        { value: "dining-area", name: "Dining Area" },
        { value: "living-area", name: "Living Area" },
        { value: "sleeping-area", name: "Sleeping Area" },
        { value: "laundry-area", name: "Laundry Area" },
        { value: "common-area", name: "Common Area" },
        { value: "reception-area", name: "Reception Area" },
        { value: "waiting-area", name: "Waiting Area" }
      ];

    case "museum":
      return [
        { value: "exhibit-area", name: "Exhibit Area" },
        { value: "cafe", name: "Cafe" },
        { value: "retail-area", name: "Retail Area" }
      ];

    case "non-refrigerated":
      return [
        { value: "shipping-and-receiving", name: "Shipping and Receiving" },
        { value: "non-refrigerated-storage", name: "Non-Refrigerated Storage" }
      ];

    case "office":
      return [
        { value: "closed-office", name: "Closed Office" },
        { value: "open-office", name: "Open Office" },
        { value: "print-room", name: "Print Room" },
        { value: "data-center", name: "Data Center" },
        { value: "vending", name: "Vending" },
        { value: "classroom", name: "Classroom" },
        { value: "media-center", name: "Media Center" }
      ];

    case "other-education":
      return [
        { value: "computer-lab", name: "Computer lab" },
        { value: "auditorium", name: "Auditorium" },
        { value: "classroom", name: "Classroom" },
        { value: "media-center", name: "Media center" },
        { value: "common-area", name: "Common Area" },
        { value: "reception-area", name: "Reception Area" },
        { value: "waiting-area", name: "Waiting Area" },
        {
          value: "transportation-waiting-area",
          name: "Transportation waiting Area"
        },
        { value: "printing-room", name: "Printing Room" },
        { value: "laboratory", name: "Laboratory" },
        { value: "stage", name: "Stage" },
        { value: "spectator-area", name: "Spectator Area" },
        { value: "lecture-hall", name: "Lecture Hall" },
        { value: "data-center", name: "Data Center" },
        { value: "security-room", name: "Security Room" },
        { value: "shipping-and-receiving", name: "Shipping and Receiving" }
      ];

    case "other-entertainment":
      return [
        { value: "cafe", name: "Cafe" },
        { value: "retail-area", name: "Retail Area" },
        { value: "auditorium", name: "Auditorium" },
        { value: "stage", name: "Stage" },
        { value: "spectator-area", name: "Spectator Area" }
      ];

    case "other-lodging/Residential":
      return [
        { value: "guestroom", name: "Guestroom" },
        { value: "laundry-area", name: "Laundry Area" },
        { value: "dining-area", name: "Dining Area" },
        { value: "living-area", name: "Living Area" },
        { value: "sleeping-area", name: "Sleeping Area" },
        { value: "lodging-area", name: "Lodging Area" },
        { value: "dressing-area", name: "Dressing Area" }
      ];

    case "other-office":
      return [
        { value: "closed-office", name: "Closed Office" },
        { value: "open-office", name: "Open Office" },
        { value: "print-room", name: "Print Room" },
        { value: "data-center", name: "Data Center" },
        { value: "vending", name: "Vending" },
        { value: "classroom", name: "Classroom" },
        { value: "media-center", name: "Media Center" }
      ];

    case "other-other":
      return [];

    case "other-public":
      return [];

    case "other-recreation":
      return [
        { value: "cafe", name: "Cafe" },
        { value: "retail-area", name: "Retail Area" },
        { value: "auditorium", name: "Auditorium" },
        { value: "stage", name: "Stage" },
        { value: "spectator-area", name: "Spectator Area" }
      ];

    case "other-restaurant":
      return [
        { value: "point-of-sale", name: "Point of Sale" },
        { value: "dry-storage", name: "Dry Storage" },
        { value: "dance-floor", name: "Dance Floor" },
        { value: "bar", name: "Bar" },
        { value: "dining-area", name: "Dining Area" },
        { value: "kitchen", name: "Kitchen" }
      ];

    case "other-retail":
      return [
        { value: "retail-area", name: "Retail Area" },
        { value: "point-of-sale", name: "Point of Sale" },
        { value: "dry-storage", name: "Dry Storage" }
      ];

    case "other-services":
      return [
        { value: "retail-area", name: "Retail Area" },
        { value: "point-of-sale", name: "Point of Sale" },
        { value: "dry-storage", name: "Dry Storage" }
      ];

    case "other-hospital":
      return [
        { value: "common-area", name: "Common Area" },
        { value: "reception-area", name: "Reception Area" },
        { value: "waiting-area", name: "Waiting Area" },
        { value: "exam-room", name: "Exam Room" },
        { value: "patient-room", name: "Patient Room" },
        { value: "physical-therapy-area", name: "Physical Therapy Area" },
        { value: "radiology", name: "Radiology" },
        { value: "lab", name: "Lab" },
        { value: "anesthesia", name: "Anesthesia" },
        { value: "biohazard", name: "BioHazard" },
        { value: "clean-work-area", name: "Clean Work Area" },
        { value: "kitchen-area", name: "Kitchen Area" },
        {
          value: "food-service-institutional",
          name: "Food Service-Institutional"
        },
        { value: "locker-room", name: "Locker Room" },
        { value: "medical-gas-area", name: "Medical Gas Area" },
        { value: "dressing-room", name: "Dressing Room" },
        { value: "lounge-area", name: "Lounge Area" },
        { value: "nurse-station", name: "Nurse Station" },
        { value: "dining-area", name: "Dining Area" },
        { value: "xray", name: "Xray" },
        { value: "mri", name: "MRI" }
      ];

    case "other-stadium":
      return [
        { value: "sport-play-area", name: "Sport Play Area" },
        { value: "retail-area", name: "Retail Area" },
        { value: "spectator-area", name: "Spectator Area" },
        { value: "food-service-fast", name: "Food Service-Fast" },
        { value: "bar", name: "Bar" },
        { value: "area", name: "Area" }
      ];

    case "other-technology":
      return [
        { value: "chemical-storage-room", name: "Chemical Storage Room" },
        {
          value: "non-chemical-storage-room",
          name: "Non-Chemical Storage Room"
        },
        { value: "clean-work-area", name: "Clean Work Area" },
        { value: "data-center", name: "Data Center" },
        { value: "high-bay-work-area", name: "High Bay Work Area" },
        { value: "lab-area", name: "Lab Area" },
        { value: "closed-office", name: "Closed Office" },
        { value: "open-office", name: "Open Office" },
        { value: "print-room", name: "Print Room" },
        { value: "vending", name: "Vending" },
        { value: "media-center", name: "Media Center" }
      ];

    case "other-utility":
      return [];

    case "outpatient-rehabilitation":
      return [
        { value: "common-area", name: "Common Area" },
        { value: "reception-area", name: "Reception Area" },
        { value: "waiting-area", name: "Waiting Area" },
        { value: "exam-room", name: "Exam Room" },
        { value: "patient-room", name: "Patient Room" },
        { value: "physical-therapy-area", name: "Physical Therapy Area" },
        { value: "radiology", name: "Radiology" },
        { value: "lab", name: "Lab" },
        { value: "anesthesia", name: "Anesthesia" },
        { value: "bio-hazard", name: "BioHazard" },
        { value: "clean-work-area", name: "Clean Work Area" },
        { value: "nurse-station", name: "Nurse Station" },
        { value: "dining-area", name: "Dining Area" },
        { value: "xray", name: "Xray" },
        { value: "mri", name: "MRI" }
      ];
    case "parking":
      return [
        { value: "open-parking-lot", name: "Open Parking Lot" },
        {
          value: "partially-enclosed-parking-garage",
          name: "Partially Enclosed Parking Garage"
        },
        { value: "enclosed-parking-garage", name: "Enclosed Parking Garage" }
      ];
    case "performing-arts":
      return [
        { value: "cafe", name: "Cafe" },
        { value: "retail-area", name: "Retail Area" },
        { value: "auditorium", name: "Auditorium" },
        { value: "stage", name: "Stage" },
        { value: "spectator-area", name: "Spectator Area" },
        { value: "bar", name: "Bar" }
      ];
    case "personal-services":
      return [
        { value: "closed-office", name: "Closed Office" },
        { value: "open-office", name: "Open Office" },
        { value: "print-room", name: "Print Room" },
        { value: "vending", name: "Vending" },
        { value: "classroom", name: "Classroom" },
        { value: "media-center", name: "Media Center" }
      ];
    case "police-station":
      return [
        { value: "cells", name: "Cells" },
        { value: "vending", name: "Vending" }
      ];

    case "pre-school":
      return [
        { value: "day-room", name: "Day Room" },
        { value: "classroom", name: "Classroom" },
        { value: "sport-play-area", name: "Sport Play Area" }
      ];

    case "prison":
      return [
        { value: "dining-area", name: "Dining Area" },
        { value: "living-area", name: "Living Area" },
        { value: "sleeping-area", name: "Sleeping Area" },
        { value: "laundry-area", name: "Laundry Area" },
        { value: "lodging-area", name: "Lodging Area" },
        { value: "dressing-area", name: "Dressing Area" },
        {
          value: "food-service-institutional",
          name: "Food Service-Institutional"
        }
      ];

    case "race-track":
      return [
        { value: "sport-play-area", name: "Sport Play Area" },
        { value: "retail-area", name: "Retail Area" },
        { value: "spectator-area", name: "Spectator Area" },
        { value: "food-service-fast", name: "Food Service-Fast" },
        { value: "bar", name: "Bar" }
      ];

    case "refrigerated-warehouse":
      return [
        { value: "refrigerated-storage", name: "Refrigerated Storage" },
        { value: "shipping-and-receiving", name: "Shipping and Receiving" }
      ];

    case "repair-services":
      return [];

    case "residential-care":
      return [
        { value: "dining-area", name: "Dining Area" },
        { value: "living-area", name: "Living Area" },
        { value: "sleeping-area", name: "Sleeping Area" },
        { value: "laundry-area", name: "Laundry Area" },
        { value: "lodging-area", name: "Lodging Area" },
        { value: "dressing-area", name: "Dressing Area" },
        {
          value: "food-service-institutional",
          name: "Food Service-Institutional"
        }
      ];

    case "residential-hall":
      return [
        { value: "dining-area", name: "Dining Area" },
        { value: "living-area", name: "Living Area" },
        { value: "sleeping-area", name: "Sleeping Area" },
        { value: "laundry-area", name: "Laundry Area" },
        { value: "lodging-area", name: "Lodging Area" },
        { value: "dressing-area", name: "Dressing Area" },
        {
          value: "food-service-institutional",
          name: "Food Service-Institutional"
        }
      ];

    case "restaurants":
      return [
        { value: "point-of-sale", name: "Point of Sale" },
        { value: "dry-storage", name: "Dry Storage" },
        { value: "dance-floor", name: "Dance Floor" },
        { value: "bar", name: "Bar" },
        { value: "dining-area", name: "Dining Area" },
        { value: "kitchen", name: "Kitchen" }
      ];

    case "retail-store":
      return [
        { value: "retail-area", name: "Retail Area" },
        { value: "point-of-sale", name: "Point of Sale" },
        { value: "dry-storage", name: "Dry Storage" }
      ];

    case "roller-rink":
      return [
        { value: "sport-play-area", name: "Sport Play Area" },
        { value: "spectator-area", name: "Spectator Area" },
        { value: "retail-area", name: "Retail Area" },
        { value: "point-of-sale", name: "Point of Sale" }
      ];

    case "self-storage":
      return [
        { value: "non-refrigerated-storage", name: "Non-Refrigerated Storage" }
      ];

    case "senior-care":
      return [
        { value: "dining-area", name: "Dining Area" },
        { value: "living-area", name: "Living Area" },
        { value: "sleeping-area", name: "Sleeping Area" },
        { value: "laundry-area", name: "Laundry Area" },
        { value: "lodging-area", name: "Lodging Area" },
        { value: "dressing-area", name: "Dressing Area" },
        {
          value: "food-service-institutional",
          name: "Food Service-Institutional"
        }
      ];

    case "single-family":
      return [
        { value: "basement", name: "Basement" },
        { value: "dining-area", name: "Dining Area" },
        { value: "living-area", name: "Living Area" },
        { value: "sleeping-area", name: "Sleeping Area" },
        { value: "laundry-area", name: "Laundry Area" }
      ];

    case "social-hall":
      return [
        { value: "cafe", name: "Cafe" },
        { value: "retail-area", name: "Retail Area" },
        { value: "auditorium", name: "Auditorium" },
        { value: "stage", name: "Stage" },
        { value: "spectator-area", name: "Spectator Area" }
      ];

    case "stadium-closed":
      return [
        { value: "sport-play-area", name: "Sport Play Area" },
        { value: "retail-area", name: "Retail Area" },
        { value: "spectator-area", name: "Spectator Area" },
        { value: "food-service-fast", name: "Food Service-Fast" },
        { value: "bar", name: "Bar" }
      ];

    case "stadium-open":
      return [
        { value: "sport-play-area", name: "Sport Play Area" },
        { value: "retail-area", name: "Retail Area" },
        { value: "spectator-area", name: "Spectator Area" },
        { value: "food-service-fast", name: "Food Service-Fast" },
        { value: "bar", name: "Bar" }
      ];

    case "strip-mall":
      return [
        { value: "retail-area", name: "Retail Area" },
        { value: "point-of-sale", name: "Point of Sale" },
        { value: "dry-storage", name: "Dry Storage" }
      ];

    case "supermarket":
      return [
        { value: "retail-area", name: "Retail Area" },
        { value: "deli", name: "Deli" },
        { value: "point-of-sale", name: "Point of Sale" },
        { value: "dry-storage", name: "Dry Storage" },
        { value: "produce", name: "Produce" },
        { value: "bakery", name: "Bakery" },
        { value: "dining-area", name: "Dining Area" }
      ];
    case "swimming-pool":
      return [
        { value: "sport-play-area", name: "Sport Play Area" },
        { value: "dressing-area", name: "Dressing Area" },
        { value: "laundry-area", name: "Laundry Area" },
        { value: "spectator-area", name: "Spectator Area" }
      ];
    case "transportation-terminal":
      return [
        {
          value: "transportation-waiting-area",
          name: "Transportation Waiting Area"
        },
        { value: "retail-area", name: "Retail Area" },
        { value: "deli", name: "Deli" },
        { value: "point-of-sale", name: "Point of Sale" }
      ];

    case "urgent-care":
      return [
        { value: "common-area", name: "Common Area" },
        { value: "reception-area", name: "Reception Area" },
        { value: "waiting-area", name: "Waiting Area" },
        { value: "exam-room", name: "Exam Room" },
        { value: "patient-room", name: "Patient Room" },
        { value: "physical-therapy-area", name: "Physical Therapy Area" },
        { value: "radiology", name: "Radiology" },
        { value: "lab", name: "Lab" },
        { value: "anesthesia", name: "Anesthesia" },
        { value: "bio-hazard", name: "BioHazard" },
        { value: "clean-work-area", name: "Clean Work Area" },
        { value: "kitchen-area", name: "Kitchen Area" },
        {
          value: "food-service-institutional",
          name: "Food Service-Institutional"
        },
        { value: "locker-room", name: "Locker Room" },
        { value: "medical-gas-area", name: "Medical Gas Area" },
        { value: "dressing-room", name: "Dressing Room" },
        { value: "lounge-area", name: "Lounge Area" },
        { value: "pacu", name: "PACU" },
        { value: "operating-room", name: "Operating Room" },
        { value: "pre-op-area", name: "Pre-Op Area" },
        { value: "nurse-station", name: "Nurse Station" },
        { value: "soil-work", name: "Soil Work" },
        { value: "procedure-room", name: "Procedure Room" },
        { value: "icu-patient-room", name: "ICU Patient Room" },
        { value: "icu-nurse-station", name: "ICU Nurse Station" },
        { value: "icu-open-area", name: "ICU Open Area" },
        { value: "ER Nurse Station", name: "ER Nurse Station" },
        { value: "ER Trauma", name: "ER Trauma" },
        { value: "ER Triage", name: "ER Triage" },
        { value: "ER Exam Room", name: "ER Exam Room" },
        { value: "dining-area", name: "Dining Area" },
        { value: "xray", name: "Xray" },
        { value: "mri", name: "MRI" }
      ];

    case "veterinary-office":
      return [
        { value: "bio-hazard", name: "BioHazard" },
        { value: "clean-work-area", name: "Clean Work Area" },
        { value: "dining-area", name: "Dining Area" }
      ];

    case "vocational-school":
      return [
        { value: "reception-area", name: "Reception Area" },
        { value: "waiting-area", name: "Waiting Area" },
        {
          value: "transportation-waiting-area",
          name: "Transportation waiting Area"
        },
        { value: "Printing Room", name: "Printing Room" }
      ];

    case "wastewater-treatment-plant":
      return [];

    case "wholesale-club":
      return [
        { value: "bakery", name: "Bakery" },
        { value: "dining-area", name: "Dining Area" }
      ];

    case "worship-facility":
      return [{ value: "worship-area", name: "Worship Area" }];

    case "zoo":
      return [{ value: "vivarium", name: "Vivarium" }];

    default:
      return [];
  }
}

function getSpaceTypes(useType) {
  const buildingUseType = getSpaceTypeByUseType(useType);
  return [...buildingUseType, ...commonSpaceTypes];
}

module.exports = {
  getSpaceTypes
};
