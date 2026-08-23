import { z } from 'zod'

export const stationSchema = z.object({
  label: z.string().min(1),
  address: z.string().optional(),
  nerisStationId: z.string().optional()
})

export type StationInput = z.infer<typeof stationSchema>
