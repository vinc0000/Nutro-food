/*
# Link sales reps to real referred organizations

organizations.referral_code has existed since the foundational schema but nothing ever
read or wrote it. Adding the matching referral_code to sales_reps lets the Sales Reps
page compute real client counts and commission (clients * their active plan MRR *
commission_rate) from actual signups, instead of showing fabricated numbers for
4 people who don't exist.
*/

ALTER TABLE public.sales_reps ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
