import { gql } from "@apollo/client";

// ─── AUTH ────────────────────────────────────────────────────────────────────

export const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
      user { id name email }
    }
  }
`;

export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user { id name email }
    }
  }
`;

export const ME_QUERY = gql`
  query Me {
    me { _id name email role avatar status }
  }
`;

// ─── ADMIN ───────────────────────────────────────────────────────────────────

export const GET_USERS = gql`
  query GetUsers {
    users { _id name email role status createdAt }
  }
`;

export const ASSIGN_ROLE = gql`
  mutation AssignRole($userId: ID!, $role: String!) {
    assignRole(userId: $userId, role: $role) { _id name email role status }
  }
`;

export const SET_USER_STATUS = gql`
  mutation SetUserStatus($userId: ID!, $status: String!) {
    setUserStatus(userId: $userId, status: $status) { _id name email role status }
  }
`;

// ─── TEAMS ───────────────────────────────────────────────────────────────────

export const GET_TEAMS = gql`
  query GetTeams {
    teams { _id name description createdAt owner { _id name email } }
  }
`;

export const CREATE_TEAM = gql`
  mutation CreateTeam($input: CreateTeamInput!) {
    createTeam(input: $input) { _id name description createdAt }
  }
`;

// ─── PROJECTS ────────────────────────────────────────────────────────────────

export const GET_PROJECTS = gql`
  query GetProjects($teamId: ID!) {
    projects(teamId: $teamId) { _id name description team createdAt }
  }
`;

export const GET_PROJECT = gql`
  query GetProject($projectId: ID!) {
    project(projectId: $projectId) { _id name description team }
  }
`;

export const GET_TEAM_MEMBERS = gql`
  query GetTeamMembers($teamId: ID!) {
    teamMembers(teamId: $teamId) { _id role user { _id name email } }
  }
`;

export const CREATE_PROJECT = gql`
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) { _id name description team createdAt }
  }
`;

// ─── TASKS ───────────────────────────────────────────────────────────────────

export const GET_TASKS = gql`
  query GetTasks($projectId: ID!) {
    tasks(projectId: $projectId) {
      _id title description status createdAt
      assignedTo { _id name email }
    }
  }
`;

export const CREATE_TASK = gql`
  mutation CreateTask($input: CreateTaskInput!) {
    createTask(input: $input) { _id title description status createdAt }
  }
`;

export const UPDATE_TASK = gql`
  mutation UpdateTask($taskId: ID!, $input: UpdateTaskInput!) {
    updateTask(taskId: $taskId, input: $input) { _id title description status }
  }
`;

export const DELETE_TASK = gql`
  mutation DeleteTask($taskId: ID!) {
    deleteTask(taskId: $taskId)
  }
`;
