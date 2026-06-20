import mongoose from 'mongoose';

const universitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  address: String,
  contactEmail: String,
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  sealImage: { type: String }, // Path/URL to the uploaded official seal image template
  sealPosition: {
    x: { type: Number, default: 75 },      // X crop start offset (percentage 0-100)
    y: { type: Number, default: 75 },      // Y crop start offset (percentage 0-100)
    width: { type: Number, default: 20 },  // Crop width (percentage 0-100)
    height: { type: Number, default: 20 }  // Crop height (percentage 0-100)
  },
  logoImage: { type: String }, // Path/URL to the uploaded official logo image template
  logoPosition: {
    x: { type: Number, default: 5 },       // X crop start offset (percentage 0-100)
    y: { type: Number, default: 5 },       // Y crop start offset (percentage 0-100)
    width: { type: Number, default: 15 },  // Crop width (percentage 0-100)
    height: { type: Number, default: 15 }  // Crop height (percentage 0-100)
  },
  templateImage: { type: String } // Path/URL to the blank template layout certificate image
}, { timestamps: true });

export default mongoose.model('University', universitySchema);
