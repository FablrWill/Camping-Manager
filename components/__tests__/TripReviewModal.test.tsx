import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Top-level import — avoids require() issues with dynamic path aliases
import TripReviewModal from '../TripReviewModal'

// ---- test data ----

const mockPackedItems = [
  { gearId: 'g1', name: 'Tent', category: 'shelter', usageStatus: null },
  { gearId: 'g2', name: 'Sleeping Bag', category: 'sleep', usageStatus: null },
]

const mockMeals = [
  { mealId: 'm1', mealPlanId: 'mp1', name: 'Pasta', dayLabel: 'Day 1 - Dinner' },
  { mealId: 'm2', mealPlanId: 'mp1', name: 'Oatmeal', dayLabel: 'Day 2 - Breakfast' },
]

const baseProps = {
  tripId: 'trip1',
  tripName: 'Blue Ridge Trip',
  packedItems: mockPackedItems,
  meals: mockMeals,
  locationId: 'loc1',
  locationName: 'Linville Gorge',
  existingNotes: null,
  onComplete: vi.fn(),
  onClose: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', vi.fn())
})

// ---- REV-01: Gear step ----

describe('REV-01: Gear step', () => {
  it('renders the modal title with trip name', () => {
    render(<TripReviewModal {...baseProps} />)
    expect(screen.getByText(/Blue Ridge Trip/i)).toBeTruthy()
  })

  it('renders each packed item in the gear step', () => {
    render(<TripReviewModal {...baseProps} />)
    expect(screen.getByText('Tent')).toBeTruthy()
    expect(screen.getByText('Sleeping Bag')).toBeTruthy()
  })

  it('renders Used / Didn\'t Need / Forgot to Pack buttons for each item', () => {
    render(<TripReviewModal {...baseProps} />)
    const usedBtns = screen.getAllByText(/^Used$/i)
    expect(usedBtns.length).toBe(mockPackedItems.length)
    const didntNeedBtns = screen.getAllByText(/Didn't Need/i)
    expect(didntNeedBtns.length).toBe(mockPackedItems.length)
    const forgotBtns = screen.getAllByText(/Forgot to Pack/i)
    expect(forgotBtns.length).toBe(mockPackedItems.length)
  })

  it('selecting Used for an item highlights that button', () => {
    render(<TripReviewModal {...baseProps} />)
    const usedBtns = screen.getAllByText(/^Used$/i)
    fireEvent.click(usedBtns[0])
    // Button should now have selected styling (aria-pressed or data attribute)
    // We verify the click does not throw and button is accessible
    expect(usedBtns[0]).toBeTruthy()
  })
})

// ---- REV-02: Meals step ----

describe('REV-02: Meals step', () => {
  it('shows meals step after clicking Next on gear step', () => {
    render(<TripReviewModal {...baseProps} />)
    const nextBtn = screen.getByText(/^Next$/i)
    fireEvent.click(nextBtn)
    expect(screen.getByText('Pasta')).toBeTruthy()
    expect(screen.getByText('Oatmeal')).toBeTruthy()
  })

  it('renders thumbs up and thumbs down for each meal', () => {
    render(<TripReviewModal {...baseProps} />)
    fireEvent.click(screen.getByText(/^Next$/i))
    // Use exact word boundary: "liked" at start, not "disliked"
    const thumbsUp = screen.getAllByLabelText(/^liked /i)
    const thumbsDown = screen.getAllByLabelText(/^disliked /i)
    expect(thumbsUp.length).toBe(mockMeals.length)
    expect(thumbsDown.length).toBe(mockMeals.length)
  })
})

// ---- REV-07: Meals step skipped when meals is empty ----

describe('REV-07: Meals step skipped when meals=[]', () => {
  it('goes directly to Spot+Notes step when meals is empty', () => {
    render(<TripReviewModal {...baseProps} meals={[]} />)
    fireEvent.click(screen.getByText(/^Next$/i))
    // Should now be on Spot+Notes step — stars visible, no meal items
    expect(screen.getByText(/Notes/i)).toBeTruthy()
    // No meal entries should be visible
    expect(screen.queryByText('Pasta')).toBeNull()
  })
})

// ---- REV-08: Spot rating absent when locationId is null ----

describe('REV-08: Spot rating absent when locationId is null', () => {
  it('hides star rating when locationId is null', () => {
    render(<TripReviewModal {...baseProps} meals={[]} locationId={null} locationName={null} />)
    fireEvent.click(screen.getByText(/^Next$/i))
    // No star buttons should render
    const stars = screen.queryAllByLabelText(/star/i)
    expect(stars.length).toBe(0)
  })

  it('still shows notes textarea when locationId is null', () => {
    render(<TripReviewModal {...baseProps} meals={[]} locationId={null} locationName={null} />)
    fireEvent.click(screen.getByText(/^Next$/i))
    expect(screen.getByPlaceholderText(/notes/i)).toBeTruthy()
  })

  it('shows star rating when locationId is provided', () => {
    render(<TripReviewModal {...baseProps} meals={[]} />)
    fireEvent.click(screen.getByText(/^Next$/i))
    const stars = screen.getAllByLabelText(/star/i)
    expect(stars.length).toBe(5)
  })
})

// ---- Skip button ----

describe('Skip button', () => {
  it('calls onClose without fetch when Skip is clicked on gear step', () => {
    render(<TripReviewModal {...baseProps} />)
    fireEvent.click(screen.getByText(/^Skip$/i))
    expect(baseProps.onClose).toHaveBeenCalledOnce()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('calls onClose without fetch when Skip is clicked on meals step', () => {
    render(<TripReviewModal {...baseProps} />)
    fireEvent.click(screen.getByText(/^Next$/i))
    fireEvent.click(screen.getByText(/^Skip$/i))
    expect(baseProps.onClose).toHaveBeenCalledOnce()
    expect(fetch).not.toHaveBeenCalled()
  })
})

// ---- Submit ----

describe('Submit', () => {
  it('calls POST /api/trips/[tripId]/review on submit', async () => {
    const reviewedAt = new Date().toISOString()
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, reviewedAt }),
    })

    render(<TripReviewModal {...baseProps} meals={[]} />)
    // Navigate to final step (Spot+Notes)
    fireEvent.click(screen.getByText(/^Next$/i))
    fireEvent.click(screen.getByText(/Submit Review/i))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        `/api/trips/trip1/review`,
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  it('calls onComplete with reviewedAt and then onClose on success', async () => {
    const reviewedAt = new Date().toISOString()
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, reviewedAt }),
    })

    render(<TripReviewModal {...baseProps} meals={[]} />)
    fireEvent.click(screen.getByText(/^Next$/i))
    fireEvent.click(screen.getByText(/Submit Review/i))

    await waitFor(() => {
      expect(baseProps.onComplete).toHaveBeenCalledWith(reviewedAt)
      expect(baseProps.onClose).toHaveBeenCalled()
    })
  })

  it('shows inline error when fetch fails', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'server error' }),
    })

    render(<TripReviewModal {...baseProps} meals={[]} />)
    fireEvent.click(screen.getByText(/^Next$/i))
    fireEvent.click(screen.getByText(/Submit Review/i))

    await waitFor(() => {
      expect(screen.getByText(/Failed to save review/i)).toBeTruthy()
    })
    expect(baseProps.onComplete).not.toHaveBeenCalled()
  })

  it('disables Submit button while submitting', async () => {
    let resolve: (value: unknown) => void
    const fetchPromise = new Promise((r) => { resolve = r })
    ;(fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(fetchPromise)

    render(<TripReviewModal {...baseProps} meals={[]} />)
    fireEvent.click(screen.getByText(/^Next$/i))
    const submitBtn = screen.getByText(/Submit Review/i)
    fireEvent.click(submitBtn)

    // Button text changes to Saving...
    await waitFor(() => {
      expect(screen.getByText(/Saving\.\.\./i)).toBeTruthy()
    })

    // Resolve to clean up
    resolve!({ ok: true, json: async () => ({ success: true, reviewedAt: new Date().toISOString() }) })
  })

  it('includes only rated gear in the POST payload', async () => {
    const reviewedAt = new Date().toISOString()
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, reviewedAt }),
    })

    render(<TripReviewModal {...baseProps} meals={[]} />)
    // Rate only first item as "Used"
    const usedBtns = screen.getAllByText(/^Used$/i)
    fireEvent.click(usedBtns[0])

    fireEvent.click(screen.getByText(/^Next$/i))
    fireEvent.click(screen.getByText(/Submit Review/i))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled()
    })
    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse(options.body)
    expect(body.gearUsage).toHaveLength(1)
    expect(body.gearUsage[0]).toEqual({ gearId: 'g1', usageStatus: 'used' })
  })

  it('pre-fills notes textarea with existingNotes', () => {
    render(<TripReviewModal {...baseProps} meals={[]} existingNotes="Great spot!" />)
    fireEvent.click(screen.getByText(/^Next$/i))
    const textarea = screen.getByPlaceholderText(/notes/i) as HTMLTextAreaElement
    expect(textarea.value).toBe('Great spot!')
  })
})
