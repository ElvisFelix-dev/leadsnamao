import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import slugify from 'slugify'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, unique: true }, // ✅ adicionado
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatar: { type: String, default: '' }, // 🆕 campo avatar
    isAdmin: { type: Boolean, default: false },
    isActive: { type: Boolean, default: false }, // 🆕 campo para status online/offline
    isBroker: { type: Boolean, default: true }, // ✅ marca como corretor
    phone: {
      type: String,
      required: false,
      validate: {
        validator: function (v) {
          return v === '+55' || /^\+55\d{10,11}$/.test(v)
        },
        message: (props) =>
          `${props.value} não é um número válido de telefone brasileiro!`,
      },
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true },
)

userSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true })
  }
  next()
})

// Antes de salvar → criptografa a senha
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
  next()
})

// Método para comparar senha
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

// Middleware para padronizar automaticamente o número
userSchema.pre('save', function (next) {
  if (this.phone) {
    let cleanNumber = this.phone.replace(/\D/g, '')

    if (!cleanNumber.startsWith('55')) {
      cleanNumber = `55${cleanNumber}`
    }

    this.phone = `+${cleanNumber}`
  }
  next()
})

export default mongoose.model('User', userSchema)
