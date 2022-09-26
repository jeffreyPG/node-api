"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const DaySchedule = {
  hour: {
    type: Number,
  },
  period: {
    type: String,
    enum: ["unoccupied", "warmup", "occupied", "cooldown"],
  },
  value: {
    type: Number,
  },
};

const ScheduleSchema = new Schema({
  name: {
    type: String,
    trim: true,
    required: "Field \"name\" is required.",
  },
  // a setpoint schedule contains arrays of temperature values, while operational schedules are fractional values (0 <= x <= 1)
  scheduleType: {
    type: String,
    enum: ["setpoint", "operational"],
  },
  monday: [DaySchedule],
  tuesday: [DaySchedule],
  wednesday: [DaySchedule],
  thursday: [DaySchedule],
  friday: [DaySchedule],
  saturday: [DaySchedule],
  sunday: [DaySchedule],
  holiday: [DaySchedule],
  applicableHolidays: [
    {
      type: String,
    },
  ],
  startDate: {
    type: String, // this would be a day and month as it is not specific to a year... so MM/DD format
  },
  endDate: {
    type: String, // this would be a day and month as it is not specific to a year... so MM/DD format
  },
  createdByUserId: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },
}, { timestamps: true });

module.exports.Schedule = mongoose.model("Schedule", ScheduleSchema);
