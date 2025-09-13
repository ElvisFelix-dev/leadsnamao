import mongoose from 'mongoose'

// Schema de imóvel
// Schema de imóvel
const propertySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    bedrooms: { type: String, required: true },
    bathrooms: { type: String, required: true },
    images: [{ type: String, required: true }],
    category: {
      type: String,
      enum: ['casa', 'apartamento'],
      required: true,
    },
    region: {
      type: String,
      enum: [
        'central',
        'zona oeste',
        'zona leste',
        'zona sul',
        'zona norte',
        'abc',
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ['planta', 'construcao', 'pronto'],
      default: 'planta',
    },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    countInStock: { type: Number, required: true },
    parking: { type: String, required: true },
    address: { type: String, required: true, unique: true },
    offer: { type: String },

    // ➕ Localização geográfica
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // vínculo com usuário que criou
      required: true,
    },
  },
  { timestamps: true },
)

export default mongoose.model('Property', propertySchema)
