import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatar: { type: String, default: '' }, // 🆕 campo avatar
    isAdmin: { type: Boolean, default: false },
    phone: {
      type: String,
      required: true,
      default: '+55',
      validate: {
        validator: function (v) {
          // Aceita só +55 (default) OU número completo
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
    // remove tudo que não é número
    let cleanNumber = this.phone.replace(/\D/g, '')

    // se não começar com 55, adiciona
    if (!cleanNumber.startsWith('55')) {
      cleanNumber = `55${cleanNumber}`
    }

    this.phone = `+${cleanNumber}`
  }
  next()
})

export default mongoose.model('User', userSchema)
