import type { Liability } from '../api/types'

export function paidRatio(liability: Liability) {
  const initial = Number(liability.initial_amount)
  if (initial <= 0) return 0
  return Math.min(1, Math.max(0, (initial - Number(liability.remaining_amount)) / initial))
}

// Simulates the same amortization schedule implied by the liability's own
// remaining balance/rate/payment (balance -= payment - interest, month by
// month) rather than requiring a separate stored field — mirrors how a
// standard loan payoff schedule is derived from those three numbers alone.
// Capped like any such simulation: a payment that doesn't even cover the
// monthly interest would never reach zero.
export function paymentsLeft(liability: Liability): number | null {
  const rate = Number(liability.interest_rate ?? 0) / 100 / 12
  const payment = Number(liability.monthly_payment ?? 0)
  let balance = Number(liability.remaining_amount)
  if (payment <= 0 || balance <= 0) return null
  let months = 0
  while (balance > 0 && months < 600) {
    balance = balance + balance * rate - payment
    months++
  }
  return months < 600 ? months : null
}
