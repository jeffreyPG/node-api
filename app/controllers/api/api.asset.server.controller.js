"use strict";

/**
 * Module dependencies.
 */
const _ = require("lodash");
const mongoose = require("mongoose");
const Asset = mongoose.model("Asset");
const BuildingEquipment = mongoose.model("BuildingEquipment");
const System = mongoose.model("System");
const PublicAsset = mongoose.model("PublicAsset");
const util = require("./utils/api.utils");
const validate = require("./utils/api.validation");
const { downloadAssets } = require("./utils/api.s3.client");

/**
 * Get public assets
 */
exports.getPublicAssets = function (req, res, next) {
  PublicAsset.find().lean(true).exec(function (err, publicAssets) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    // Return the buildings assets object
    res.sendResult = {
      status: "Success",
      message: "Retrieved Public Assets",
      publicAssets: publicAssets || [],
    };
    return next();
  });
};

/**
 * Get a building's assets
 */
exports.getAssets = function (req, res, next) {
  const assetIds = req.building.assetIds;

  Asset.find({ _id: { $in: assetIds } }, function (err, assets) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    // Return the buildings assets object
    res.sendResult = {
      status: "Success",
      message: "Retrieved Assets",
      assets: assets || [],
    };
    return next();
  });
};

const getImagePathAndName = function(image) {
  let awsImageKey = image.replace(/^.*\/\/[^\/]+/, '');
  if(awsImageKey.charAt(0) === '/'){
    awsImageKey = awsImageKey.slice(1)
  }
  const imageName = awsImageKey.split('/').pop()
  return {path: awsImageKey, name: imageName};
}

/**
 * Download entire building's assets
 */
exports.downloadAssets = async function (request, response, next) {
  const building = request.building;
  const images = [];
  const archievedFiles = [];
  const equipments = await BuildingEquipment.find({building: building._id});
  equipments.forEach((equipment) => {
    const equipmentImages = equipment.images || [];
    equipmentImages.forEach(image => {
      const {path, name} = getImagePathAndName(image);
      images.push(path);
      archievedFiles.push({name: `Equipment/${name}`})
    })
  })
  const systems = await System.find({building: building._id});
  systems.forEach((system) => {
    const systemImages = system.images || [];
    systemImages.forEach(image => {
      const {path, name} = getImagePathAndName(image);
      images.push(path);
      archievedFiles.push({name: `System/${name}`})
    })
  })
  const constructions = building.constructions || [];
  constructions.forEach((construction) => {
    const constructionImages = construction.images || [];
    constructionImages.forEach(image => {
      const {path, name} = getImagePathAndName(image);
      images.push(path);
      archievedFiles.push({name: `Construction/${name}`})
    })
  })
  if(images.length > 0) {
    response.set('content-type', 'application/zip')
    response.set('content-disposition', `attachment; filename="${building.buildingName} Assets.zip"`)
    response.cookie('downloading', 'finished', { path: '/' });
    downloadAssets(images, archievedFiles).pipe(response)
  } else {
    response.cookie('downloading', 'finished', { path: '/' });
    return util.sendError("No assets found", 400, request, response, next);
  }
};

/**
 * Get single asset by id
 */
exports.getAsset = function (req, res, next) {
  const asset = req.asset;

  asset.updated = Date.now();
  asset.save(function (err) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    res.sendResult = {
      status: "Success",
      message: "Retrieved Asset",
      asset: asset,
    };
    return next();
  });
};

/**
 * Create an asset on a building
 */
exports.createAsset = function (req, res, next) {
  const user = req.user;
  const building = req.building;
  const reqAsset = req.body;

  if (!reqAsset) {
    return util.sendError("Invalid request.", 400, req, res, next);
  }

  reqAsset.createdByUserId = user._id;

  const asset = new Asset(reqAsset);

  asset.validate(function (err) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    building.assetIds.push(asset._id);
    building.markModified("assetIds");

    building.save(function (err, building) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }

      asset.save(function (err) {
        if (err) {
          return util.sendError(err, 400, req, res, next);
        }

        // Return the asset obj
        res.sendResult = {
          status: "Success",
          message: "Created Asset",
          asset: asset,
          building: building,
        };
        return next();
      });
    });
  });
};

/**
 * Edit an existing asset on a building
 */
exports.updateAsset = function (req, res, next) {
  const reqAsset = req.body;
  const building = req.building;

  const asset = _.extend(req.asset, reqAsset);

  asset.validate(function (err) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    asset.save(function (err) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }

      res.sendResult = {
        status: "Success",
        message: "Updated Asset",
        asset: asset,
        building: building,
      };
      return next();
    });
  });
};

/**
 * Delete Asset
 */
exports.deleteAsset = function (req, res, next) {
  let building = req.building;
  const asset = req.asset;

  // remove all instances of that asset id on the building model
  const tempAssetIds = building.assetIds;
  for (let i = tempAssetIds.length - 1; i >= 0; i--) {
    if (tempAssetIds[i].toString() === asset._id.toString()) {
      tempAssetIds.splice(i, 1);
    }
  }

  // save building with asset id removed from array
  building = _.extend(building, {
    assetIds: tempAssetIds,
  });

  building.save(function (err, building) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    asset.remove(function (err) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }

      res.sendResult = {
        status: "Success",
        message: "Removed Asset",
        asset: asset,
        building: building,
      };

      return next();
    });
  });
};

/**
 * Asset param middleware
 */
exports.assetById = function (req, res, next, id) {
  if (!validate.valMongoObjId(id)) {
    return next(new Error("Invalid ID present in request."));
  }

  Asset.findById(id).exec(function (err, asset) {
    if (err) return next(err);
    if (!asset) return next(new Error("Failed to load Asset " + id));
    req.asset = asset;
    return next();
  });
};
