import mongoose from 'mongoose'
import Lead from '../models/Lead.js'

import { LEAD_STAGES } from '../constants/leadStages.js'
import { LEAD_PRIORITY } from '../constants/leadPriority.js'

await mongoose.connect(process.env.MONGO_URI)

const result = await Lead.updateMany(
  {
    stage: { $exists: false },
  },
  {
    $set: {
      stage: LEAD_STAGES.NEW,
      priority: LEAD_PRIORITY.MEDIUM,
      stageHistory: [],
      contactHistory: [],
      score: 0,
    },
  },
)

console.log(result)

process.exit()
