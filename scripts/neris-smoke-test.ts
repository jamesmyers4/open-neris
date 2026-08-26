import { prisma } from '../lib/prisma'
import { getAccessToken, submitIncident } from '../lib/neris/api-client'
import { buildIncidentPayload } from '../lib/neris/build-incident-payload'
import { getIncidentDetail } from '../lib/incidents/get-incident-detail'

function arg(name: string): string | undefined {
  const flag = `--${name}`
  const index = process.argv.indexOf(flag)
  return index >= 0 ? process.argv[index + 1] : undefined
}

async function main() {
  const departmentId = arg('department')
  const incidentId = arg('incident')

  if (!departmentId) {
    console.error('Usage: tsx scripts/neris-smoke-test.ts --department <departmentId> [--incident <incidentId>]')
    process.exit(1)
  }

  const department = await prisma.department.findUniqueOrThrow({ where: { id: departmentId } })

  if (!department.nerisVendorClientId || !department.nerisVendorSecretCipher) {
    console.error('This department has no NERIS credentials configured — set them via /admin/settings first.')
    process.exit(1)
  }

  console.log(`Requesting a ${department.nerisEnvironment} access token for client ${department.nerisVendorClientId}...`)
  const token = await getAccessToken(department.nerisEnvironment, department.nerisVendorClientId, department.nerisVendorSecretCipher)
  console.log(`Token exchange succeeded (token length ${token.length}).`)

  if (!incidentId) {
    console.log('No --incident given — stopping after the token exchange. Pass --incident <id> to also attempt a real submission.')
    return
  }

  if (!department.nerisFdId) {
    console.error('This department has no nerisFdId set — cannot submit an incident without it.')
    process.exit(1)
  }

  const incident = await getIncidentDetail(incidentId, departmentId)
  if (!incident) {
    console.error(`No incident ${incidentId} found in department ${departmentId}.`)
    process.exit(1)
  }

  const built = buildIncidentPayload(incident, department.nerisFdId)
  if (!built.ok) {
    console.error('Could not build a NERIS payload for this incident:')
    built.errors.forEach(e => console.error(` - ${e}`))
    process.exit(1)
  }

  console.log(`Submitting incident ${incident.internalId} to NERIS ${department.nerisEnvironment}...`)
  const result = await submitIncident(department.nerisEnvironment, department.nerisVendorClientId, department.nerisVendorSecretCipher, department.nerisFdId, built.payload)
  console.log(`Response status: ${result.status}`)
  console.log(JSON.stringify(result.body, null, 2))
}

main()
  .catch(error => {
    console.error('Smoke test failed:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
