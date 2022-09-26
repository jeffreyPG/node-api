const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const EndUseSchema = new Schema(
    {
        building: {
            type: Schema.Types.ObjectId,
            ref: "Building"
        },
        date: {
            type: Date,
        },
        month: {
            type: String,
        },
        year: {
            type: String,
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

module.exports.MonthlyEndUse = mongoose.model("MonthlyEndUse", EndUseSchema);