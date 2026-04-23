-- Add group field to categories for higher-level organization
alter table categories
  add column if not exists group_name text;

-- Assign groups to existing categories
update categories set group_name = 'Work'  where slug = 'career';
update categories set group_name = 'Work'  where slug = 'business';
update categories set group_name = 'Money' where slug = 'finance';
update categories set group_name = 'Life'  where slug = 'health';
update categories set group_name = 'Life'  where slug = 'travel';

-- Index for faster group-based queries
create index if not exists idx_categories_group_name on categories(group_name);
