const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const EndUseSchema = new Schema(
    {
        building: {
            type: String,
        },
        date: {
            type: Date,
        },
        year: {
            type: String
        },
        actual: {
            type: Boolean,
        },
        enduse: {
            type: Object,
        },
        electricenduse: {
            type: Object,
        },
        naturalgasenduse: {
            type: Object,
        }
    },
    { timestamps: true }
);

module.exports.YearlyEndUse = mongoose.model("YearlyEndUse", EndUseSchema);