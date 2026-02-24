import { prisma } from '../src/lib/db'

async function main() {
  console.log('Seeding mock access data...')

  // Find a client
  const client = await prisma.client.findFirst()
  if (!client) {
      console.log('No client found. Create a client first.')
      return;
  }

  // Create Apps
  const zendesk = await prisma.dataSource.create({
      data: {
          clientId: client.id,
          type: 'ZENDESK',
          name: 'Zendesk Support',
          category: 'APP',
          externalId: 'evalco.zendesk.com',
          token: 'dummy',
          active: true,
      }
  })

  const slack = await prisma.dataSource.create({
      data: {
          clientId: client.id,
          type: 'SLACK',
          name: 'Company Slack',
          category: 'APP',
          externalId: 'evalco.slack.com',
          token: 'dummy',
          active: true,
      }
  })

  // Create dummy users
  const dummyUsers = [
      { email: 'tom@evalco.io', name: 'Tom Johnson', role: 'Manager' },
      { email: 'kimi@evalco.io', name: 'Kimi Whooper', role: 'Designer' },
      { email: 'frank@evalco.io', name: 'Frank Swift', role: 'Org admin' }
  ]

  for (const user of dummyUsers) {
      // Tom gets Zendesk
      if (user.name === 'Tom Johnson') {
          await prisma.linkedAccount.create({
              data: {
                  dataSourceId: zendesk.id,
                  email: user.email,
                  name: user.name,
                  role: user.role,
                  status: 'ACTIVE'
              }
          })
      }
      
      // Kimi gets Slack
      if (user.name === 'Kimi Whooper') {
           await prisma.linkedAccount.create({
              data: {
                  dataSourceId: slack.id,
                  email: user.email,
                  name: user.name,
                  role: user.role,
                  status: 'ACTIVE'
              }
          })
      }

      // Frank gets both
      if (user.name === 'Frank Swift') {
          await prisma.linkedAccount.create({
              data: {
                  dataSourceId: slack.id,
                  email: user.email,
                  name: user.name,
                  role: user.role,
                  status: 'ACTIVE'
              }
          })
          await prisma.linkedAccount.create({
              data: {
                  dataSourceId: zendesk.id,
                  email: user.email,
                  name: user.name,
                  role: user.role,
                  status: 'ACTIVE'
              }
          })
      }
  }

  console.log('Done mapping mock access data!')
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
