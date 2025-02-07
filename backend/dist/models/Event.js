"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const eventSchema = new mongoose_1.default.Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    location: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    creator: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    attendees: [{
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: 'User'
        }],
    maxAttendees: {
        type: Number,
        required: true,
    },
    imageUrl: {
        type: String,
    }
}, {
    timestamps: true
});
const Event = mongoose_1.default.model('Event', eventSchema);
exports.default = Event;
