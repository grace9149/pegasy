-- Trackify Database Schema
-- Run this in the Supabase SQL Editor

-- ─────────────────────────────────────────
-- WORKSPACES
-- ─────────────────────────────────────────
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- WORKSPACE MEMBERS
-- ─────────────────────────────────────────
create type workspace_role as enum ('owner', 'admin', 'member');

create table workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role workspace_role not null default 'member',
  created_at timestamptz default now(),
  unique(workspace_id, user_id)
);

-- ─────────────────────────────────────────
-- CLIENTS
-- ─────────────────────────────────────────
create table clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  archived boolean default false,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- PROJECTS
-- ─────────────────────────────────────────
create table projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  name text not null,
  color text default '#3B82F6',
  billable boolean default false,
  archived boolean default false,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- TASKS
-- ─────────────────────────────────────────
create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  done boolean default false,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- TAGS
-- ─────────────────────────────────────────
create table tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  unique(workspace_id, name)
);

-- ─────────────────────────────────────────
-- TIME ENTRIES
-- ─────────────────────────────────────────
create table time_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  task_id uuid references tasks(id) on delete set null,
  description text,
  billable boolean default false,
  start_time timestamptz not null,
  end_time timestamptz,
  duration integer, -- seconds; null means timer is still running
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- TIME ENTRY TAGS (junction)
-- ─────────────────────────────────────────
create table time_entry_tags (
  time_entry_id uuid not null references time_entries(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (time_entry_id, tag_id)
);

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table clients enable row level security;
alter table projects enable row level security;
alter table tasks enable row level security;
alter table tags enable row level security;
alter table time_entries enable row level security;
alter table time_entry_tags enable row level security;

-- Members can see their own workspaces
create policy "workspace members can view workspace"
  on workspaces for select
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = workspaces.id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "workspace members can view membership"
  on workspace_members for select
  using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.user_id = auth.uid()
    )
  );

-- Workspace members can view clients, projects, tasks, tags
create policy "workspace members can view clients"
  on clients for select
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = clients.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "workspace members can view projects"
  on projects for select
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = projects.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "workspace members can view tasks"
  on tasks for select
  using (
    exists (
      select 1 from projects
      join workspace_members on workspace_members.workspace_id = projects.workspace_id
      where projects.id = tasks.project_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "workspace members can view tags"
  on tags for select
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = tags.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

-- Users can only see their own time entries
create policy "users can view own time entries"
  on time_entries for select
  using (user_id = auth.uid());

create policy "users can insert own time entries"
  on time_entries for insert
  with check (user_id = auth.uid());

create policy "users can update own time entries"
  on time_entries for update
  using (user_id = auth.uid());

create policy "users can delete own time entries"
  on time_entries for delete
  using (user_id = auth.uid());

-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────
create index on time_entries (user_id, start_time desc);
create index on time_entries (workspace_id, start_time desc);
create index on workspace_members (user_id);
create index on projects (workspace_id);
create index on tasks (project_id);
