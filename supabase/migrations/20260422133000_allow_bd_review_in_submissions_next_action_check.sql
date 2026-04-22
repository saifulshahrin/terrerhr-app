/*
  # Allow BD review stages in submissions constraints

  The app uses `ready_for_bd_review` for recruiter-to-BD handoff and `hold`
  for paused BD decisions. The live constraints only allowed older active stages
  and `on_hold`, so BD handoff failed before the row could enter the queue.
*/

ALTER TABLE submissions
  DROP CONSTRAINT IF EXISTS submissions_stage_check;

ALTER TABLE submissions
  ADD CONSTRAINT submissions_stage_check
  CHECK (
    submission_stage = ANY (
      ARRAY[
        'new',
        'approached',
        'responded',
        'shortlisted',
        'ready_for_bd_review',
        'submitted_to_client',
        'interview',
        'offer',
        'hired',
        'rejected',
        'withdrew',
        'hold',
        'on_hold'
      ]::text[]
    )
  );

ALTER TABLE submissions
  DROP CONSTRAINT IF EXISTS submissions_next_action_check;

ALTER TABLE submissions
  ADD CONSTRAINT submissions_next_action_check
  CHECK (
    (
      submission_stage = ANY (
        ARRAY[
          'new',
          'approached',
          'responded',
          'shortlisted',
          'ready_for_bd_review',
          'submitted_to_client',
          'interview',
          'offer',
          'hold',
          'on_hold'
        ]::text[]
      )
      AND next_action_date IS NOT NULL
    )
    OR
    (
      submission_stage = ANY (
        ARRAY[
          'hired',
          'rejected',
          'withdrew'
        ]::text[]
      )
      AND next_action_date IS NULL
    )
  );
