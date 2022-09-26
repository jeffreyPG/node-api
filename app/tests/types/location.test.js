const assert = require("assert");
const gql = require("graphql-tag");
const mongoose = require("mongoose");
const { createTestClient } = require("apollo-server-testing");

const { constructTestServer } = require("./__utils");
const { Building } = require("../../models/building.server.model");
const { User } = require("../../models/user.server.model");
const { Location } = require("../../models/location.server.model");
const { Equipment } = require("../../types/equipment/equipment.model");
const {
  BuildingEquipment
} = require("../../types/buildingequipment/buildingequipment.model");

const ADD_BUILDING_LOCATION = gql`
  mutation addBuildingLocation($input: addBuildingLocationInput!) {
    addBuildingLocation(input: $input) {
      _id
      name
      usetype
    }
  }
`;

const ADD_BUILDING_LOCATION_EQUIPMENT = gql`
  mutation addBuildingLocationEquipment(
    $input: addBuildingLocationEquipmentInput!
  ) {
    addBuildingLocationEquipment(input: $input) {
      _id
      location {
        _id
        name
      }
      equipment {
        _id
      }
    }
  }
`;

const REMOVE_BUILDING_LOCATION_EQUIPMENT = gql`
  mutation removeBuildingLocationEquipment(
    $input: removeBuildingLocationEquipmentInput!
  ) {
    removeBuildingLocationEquipment(input: $input) {
      _id
      location {
        _id
        name
      }
      equipment {
        _id
      }
    }
  }
`;

const ADD_BUILDING_LOCATIONS = gql`
  mutation AddBuildingLocations($input: AddBuildingLocationsInput!) {
    addBuildingLocations(input: $input) {
      _id
      locations {
        _id
        location {
          _id
        }
        equipment {
          _id
        }
      }
    }
  }
`;

const COPY_BUILDING_LOCATIONS = gql`
  mutation CopyBuildingLocations($input: CopyBuildingLocationsInput!) {
    copyBuildingLocations(input: $input) {
      _id
      locations {
        _id
        location {
          _id
        }
        equipment {
          _id
        }
      }
    }
  }
`;

describe("Location", () => {
  let user;
  let building;
  let location;
  let equipment;
  let buildingEquipment;

  beforeEach(async function () {
    user = await User.create({
      name: "testing-user123",
      email: "testing123@email.com",
      password: "password"
    });

    building = await Building.create({
      buildingName: "Test Water Site",
      siteName: "Test Water Site",
      projectType: "Water",
      buildingType: "buildingType1",
      yearBuilt: "1976-2000",
      numberOfFloors: "6-10",
      occupancy: "6-10",
      floorArea: 42,
      createdByUserId: user._id,
      location: {
        city: "Test City",
        state: "CO",
        zip: "80229",
        address: "123 Test Address"
      }
    });

    equipment = await Equipment.create({
      name: "Test Equipment",
      displayName: "Test Equipment"
    });

    location = await Location.create({
      buildingId: building._id.toString(),
      usetype: "office",
      name: "Test offices",
      floor: 0,
      conditioning: "heating & cooling",
      user: user._id.toString(),
      area: 2500.0,
      length: 50.0,
      width: 50.0,
      height: 100.0,
      equipment: []
    });

    buildingEquipment = await BuildingEquipment.create({
      building: building._id.toString(),
      libraryEquipment: equipment._id,
      quantity: 5
    });
  });

  afterEach(async function () {
    await User.collection.drop();
    await Building.collection.drop();
    await Equipment.collection.drop();
    await Location.collection.drop();
    await BuildingEquipment.collection.drop();
  });

  it("Creates a location", async () => {
    const { server, database } = await constructTestServer({
      context: () => ({ user: user.toObject(), isLoggedIn: true })
    });
    const { query, mutate } = createTestClient(server);
    const { data } = await mutate({
      query: ADD_BUILDING_LOCATION,
      variables: {
        input: {
          buildingId: building._id.toString(),
          usetype: "office",
          name: "Test office",
          floor: 0,
          conditioning: "heating & cooling",
          user: user._id.toString(),
          area: 2500.0,
          length: 50.0,
          width: 50.0,
          height: 100.0,
          equipment: []
        }
      }
    });

    assert(data.addBuildingLocation);
  });

  it("Add equipment to location", async () => {
    const { server, database } = await constructTestServer({
      context: () => ({ user: user.toObject(), isLoggedIn: true })
    });
    const { mutate } = createTestClient(server);

    await Building.findOneAndUpdate(
      { _id: building._id.toString() },
      {
        $addToSet: {
          locations: {
            location: location._id,
            equipment: []
          }
        }
      }
    );
    const { data } = await mutate({
      query: ADD_BUILDING_LOCATION_EQUIPMENT,
      variables: {
        input: {
          buildingId: building._id.toString(),
          locationId: location._id.toString(),
          buildingEquipmentId: buildingEquipment._id.toString()
        }
      }
    });

    assert.equal(data.addBuildingLocationEquipment.equipment.length, 1);
    assert.equal(
      data.addBuildingLocationEquipment.equipment[0]._id.toString(),
      buildingEquipment._id.toString()
    );
  });

  it("Remove equipment from location", async () => {
    const { server, database } = await constructTestServer({
      context: () => ({ user: user.toObject(), isLoggedIn: true })
    });
    const { mutate } = createTestClient(server);

    await Building.findOneAndUpdate(
      { _id: building._id.toString() },
      {
        $addToSet: {
          locations: {
            location: location._id.toString(),
            equipment: [mongoose.Types.ObjectId()]
          }
        }
      }
    );

    const { data } = await mutate({
      query: REMOVE_BUILDING_LOCATION_EQUIPMENT,
      variables: {
        input: {
          buildingId: building._id.toString(),
          locationId: location._id.toString(),
          buildingEquipmentId: buildingEquipment._id.toString()
        }
      }
    });
    assert.equal(data.removeBuildingLocationEquipment.equipment.length, 0);
  });

  it("Adds building locations", async () => {
    const { server, database } = await constructTestServer({
      context: () => ({ user: user.toObject(), isLoggedIn: true })
    });
    const { mutate } = createTestClient(server);

    const updatedBuilding = await Building.findOneAndUpdate(
      { _id: building._id.toString() },
      {
        $addToSet: {
          locations: {
            location: location._id.toString(),
            equipment: [buildingEquipment._id]
          }
        }
      },
      { new: true }
    );

    const { data } = await mutate({
      query: ADD_BUILDING_LOCATIONS,
      variables: {
        input: {
          buildingId: building._id.toString(),
          namefrom: 1,
          nameto: 2,
          usetype: "office"
        }
      }
    });

    assert.equal(data.addBuildingLocations.locations.length, 3);
  });

  it("Copies building locations", async () => {
    const { server, database } = await constructTestServer({
      context: () => ({ user: user.toObject(), isLoggedIn: true })
    });
    const { mutate } = createTestClient(server);

    const updatedBuilding = await Building.findOneAndUpdate(
      { _id: building._id.toString() },
      {
        $addToSet: {
          locations: {
            location: location._id.toString(),
            equipment: [buildingEquipment._id]
          }
        }
      },
      { new: true }
    );

    const { data } = await mutate({
      query: COPY_BUILDING_LOCATIONS,
      variables: {
        input: {
          buildingId: building._id.toString(),
          buildingLocationId: updatedBuilding.locations[0]._id.toString(),
          namefrom: 1,
          nameto: 2,
          usetype: "office"
        }
      }
    });

    assert.equal(data.copyBuildingLocations.locations.length, 3);
  });

  it("Copies equipment from building locations", async () => {
    const { server, database } = await constructTestServer({
      context: () => ({ user: user.toObject(), isLoggedIn: true })
    });
    const { mutate } = createTestClient(server);
    const locationToCopy = {
      location: location._id.toString(),
      equipment: [buildingEquipment._id]
    };

    building = await Building.create({
      buildingName: "Test Water Site",
      siteName: "Test Water Site",
      projectType: "Water",
      buildingType: "buildingType1",
      yearBuilt: "1976-2000",
      numberOfFloors: "6-10",
      occupancy: "6-10",
      floorArea: 42,
      createdByUserId: user._id,
      location: {
        city: "Test City",
        state: "CO",
        zip: "80229",
        address: "123 Test Address"
      },
      locations: [locationToCopy]
    });

    const { data } = await mutate({
      query: COPY_BUILDING_LOCATIONS,
      variables: {
        input: {
          buildingId: building._id.toString(),
          buildingLocationId: building.locations[0]._id.toString(),
          namefrom: 1,
          nameto: 2,
          usetype: "office"
        }
      }
    });

    assert(
      data.copyBuildingLocations.locations.every(buildingLocation => {
        return buildingLocation.equipment.length === 1;
      })
    );
  });
});
