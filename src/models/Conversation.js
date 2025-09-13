import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema(
  {
    from: { type: String, required: true }, // "Admin" ou usuário
    to: { type: String, required: true },
    body: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const conversationSchema = new mongoose.Schema(
  {
    userName: { type: String, required: true }, // quem iniciou a conversa
    messages: [messageSchema],
  },
  { timestamps: true },
)

const Conversation = mongoose.model('Conversation', conversationSchema)
export default Conversation
