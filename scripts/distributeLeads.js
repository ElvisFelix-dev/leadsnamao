// scripts/distributeLeads.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { processPendingLeads } from '../src/service/leadDistributionService.js'
import Lead from '../src/models/Lead.js'

dotenv.config()

async function distributeLeads() {
  const startTime = Date.now()

  try {
    console.log('🔌 Conectando ao MongoDB...')
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Conectado\n')

    // ==========================================
    // 1. DIAGNÓSTICO INICIAL
    // ==========================================
    console.log('🔍 Verificando leads pendentes...\n')

    const pendingCount = await Lead.countDocuments({
      $or: [{ assignedTo: { $exists: false } }, { assignedTo: null }],
      isDeleted: { $ne: true },
    })

    console.log(`📊 Leads pendentes encontrados: ${pendingCount}\n`)

    if (pendingCount === 0) {
      console.log('🎉 Nenhum lead pendente! Todos já foram distribuídos.')
      await mongoose.disconnect()
      return
    }

    // ==========================================
    // 2. EXECUTAR DISTRIBUIÇÃO
    // ==========================================
    console.log('🔄 Iniciando distribuição automática...\n')

    const result = await processPendingLeads()

    // ==========================================
    // 3. RESULTADO
    // ==========================================
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log('\n📊 RESULTADO DA DISTRIBUIÇÃO:')
    console.log(`   Total processado:  ${result.totalProcessed}`)
    console.log(`   Distribuídos:      ${result.distributed}`)
    console.log(
      `   Não distribuídos:  ${result.totalProcessed - result.distributed}`,
    )
    console.log(`   Tempo:             ${duration}s`)
    console.log('')

    // ==========================================
    // 4. VERIFICAÇÃO FINAL
    // ==========================================
    const remaining = await Lead.countDocuments({
      $or: [{ assignedTo: { $exists: false } }, { assignedTo: null }],
      isDeleted: { $ne: true },
    })

    console.log(`📊 Leads ainda pendentes: ${remaining}`)
    console.log('')

    if (result.distributed > 0) {
      console.log(`🎉 ${result.distributed} leads distribuídos com sucesso!`)
    } else {
      console.log('⚠️  Nenhum lead foi distribuído. Verifique:')
      console.log('   - Se há corretores ativos')
      console.log('   - Se há corretores com capacidade disponível')
      console.log('   - Se as regiões dos leads batem com as dos corretores')
    }

    await mongoose.disconnect()
    console.log('\n✅ Desconectado do MongoDB')
  } catch (error) {
    console.error('❌ Erro:', error)
    await mongoose.disconnect()
    process.exit(1)
  }
}

distributeLeads()
