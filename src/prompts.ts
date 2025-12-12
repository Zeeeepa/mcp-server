import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerPrompts(server: McpServer) {
  // Code exploration prompt
  server.registerPrompt(
    'explore-codebase',
    {
      title: 'Explore Codebase',
      description: 'Get an overview of a project codebase structure and key components',
      argsSchema: {
        project_id: z.string().uuid().describe('Project ID to explore'),
        focus_area: z.string().optional().describe('Optional area to focus on (e.g., "authentication", "api routes")'),
      },
    },
    async (args) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `I want to understand the codebase for project ${args.project_id}${args.focus_area ? ` with focus on ${args.focus_area}` : ''}.

Please help me by:
1. First, use \`projects.overview\` to get the project summary
2. Use \`projects.files\` to list the key files
3. Use \`search.semantic\` to find relevant code${args.focus_area ? ` related to "${args.focus_area}"` : ''}
4. Summarize the architecture and key patterns you observe

Provide a clear, structured overview that helps me navigate this codebase effectively.`,
          },
        },
      ],
    })
  );

  // Memory capture prompt
  server.registerPrompt(
    'capture-decision',
    {
      title: 'Capture Decision',
      description: 'Document an architectural or technical decision in workspace memory',
      argsSchema: {
        workspace_id: z.string().uuid().describe('Workspace ID'),
        decision_title: z.string().describe('Brief title of the decision'),
        context: z.string().describe('What prompted this decision'),
        decision: z.string().describe('The decision made'),
        consequences: z.string().optional().describe('Expected consequences or tradeoffs'),
      },
    },
    async (args) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please document the following decision in workspace memory:

**Title:** ${args.decision_title}
**Context:** ${args.context}
**Decision:** ${args.decision}
${args.consequences ? `**Consequences:** ${args.consequences}` : ''}

Use \`memory.create_event\` with:
- event_type: "decision"
- workspace_id: "${args.workspace_id}"
- title: The decision title
- content: A well-formatted ADR (Architecture Decision Record) with context, decision, and consequences
- metadata: Include relevant tags and status

After creating, confirm the decision was recorded and summarize it.`,
          },
        },
      ],
    })
  );

  // Code review context prompt
  server.registerPrompt(
    'review-context',
    {
      title: 'Code Review Context',
      description: 'Build context for reviewing code changes',
      argsSchema: {
        project_id: z.string().uuid().describe('Project ID'),
        file_paths: z.string().describe('Comma-separated file paths being changed'),
        change_description: z.string().describe('Brief description of the changes'),
      },
    },
    async (args) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `I need context to review changes in these files: ${args.file_paths}

Change description: ${args.change_description}

Please help me understand the impact by:
1. Use \`graph.dependencies\` to find what depends on these files
2. Use \`graph.impact\` to analyze potential impact
3. Use \`memory.search\` to find related decisions or notes about these areas
4. Use \`search.semantic\` to find related code patterns

Provide:
- Summary of what these files do
- What other parts of the codebase might be affected
- Any relevant past decisions or context from memory
- Potential risks or areas to focus the review on`,
          },
        },
      ],
    })
  );

  // Debug investigation prompt
  server.registerPrompt(
    'investigate-bug',
    {
      title: 'Investigate Bug',
      description: 'Build context for debugging an issue',
      argsSchema: {
        project_id: z.string().uuid().describe('Project ID'),
        error_message: z.string().describe('Error message or symptom'),
        affected_area: z.string().optional().describe('Known affected area or component'),
      },
    },
    async (args) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `I'm investigating a bug:

**Error/Symptom:** ${args.error_message}
${args.affected_area ? `**Affected Area:** ${args.affected_area}` : ''}

Please help me investigate by:
1. Use \`search.semantic\` to find code related to this error
2. Use \`search.pattern\` to find where similar errors are thrown
3. Use \`graph.call_path\` to trace call flows if we identify key functions
4. Use \`memory.search\` to check if this issue has been encountered before

Provide:
- Likely locations where this error originates
- Call flow analysis
- Any related past issues from memory
- Suggested debugging approach`,
          },
        },
      ],
    })
  );

  // Knowledge graph exploration prompt
  server.registerPrompt(
    'explore-knowledge',
    {
      title: 'Explore Knowledge Graph',
      description: 'Navigate and understand the knowledge graph for a workspace',
      argsSchema: {
        workspace_id: z.string().uuid().describe('Workspace ID'),
        starting_topic: z.string().optional().describe('Topic to start exploration from'),
      },
    },
    async (args) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Help me explore the knowledge captured in workspace ${args.workspace_id}${args.starting_topic ? ` starting from "${args.starting_topic}"` : ''}.

Please:
1. Use \`memory.list_nodes\` to see available knowledge nodes
2. Use \`memory.decisions\` to see decision history
3. ${args.starting_topic ? `Use \`memory.search\` to find nodes related to "${args.starting_topic}"` : 'Use \`memory.summary\` to get an overview'}
4. Use \`graph.related\` to explore connections between nodes

Provide:
- Overview of knowledge captured
- Key themes and topics
- Important decisions and their rationale
- Connections between different pieces of knowledge`,
          },
        },
      ],
    })
  );

  // Onboarding context prompt
  server.registerPrompt(
    'onboard-to-project',
    {
      title: 'Project Onboarding',
      description: 'Generate onboarding context for a new team member',
      argsSchema: {
        project_id: z.string().uuid().describe('Project ID'),
        workspace_id: z.string().uuid().describe('Workspace ID'),
        role: z.string().optional().describe('Role of the person being onboarded (e.g., "backend developer", "frontend developer")'),
      },
    },
    async (args) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Create an onboarding guide for a new team member joining this project.
${args.role ? `They will be working as a ${args.role}.` : ''}

Please gather comprehensive context:
1. Use \`projects.overview\` and \`projects.statistics\` for project summary
2. Use \`projects.files\` to identify key entry points
3. Use \`memory.timeline\` to see recent activity and changes
4. Use \`memory.decisions\` to understand key architectural choices
5. Use \`search.semantic\` to find documentation and READMEs

Provide an onboarding guide that includes:
- Project overview and purpose
- Technology stack and architecture
- Key files and entry points${args.role ? ` relevant to ${args.role}` : ''}
- Important decisions and their rationale
- Recent changes and current focus areas
- Getting started steps`,
          },
        },
      ],
    })
  );

  // Refactoring analysis prompt
  server.registerPrompt(
    'analyze-refactoring',
    {
      title: 'Refactoring Analysis',
      description: 'Analyze a codebase for refactoring opportunities',
      argsSchema: {
        project_id: z.string().uuid().describe('Project ID'),
        target_area: z.string().optional().describe('Specific area to analyze'),
      },
    },
    async (args) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Analyze the codebase for refactoring opportunities${args.target_area ? ` in ${args.target_area}` : ''}.

Please investigate:
1. Use \`graph.circular_dependencies\` to find circular dependencies
2. Use \`graph.unused_code\` to find dead code
3. Use \`search.pattern\` to find code duplication patterns
4. Use \`projects.statistics\` to identify complex areas

Provide:
- Circular dependencies that should be broken
- Unused code that can be removed
- Duplicate patterns that could be consolidated
- High complexity areas that need simplification
- Prioritized refactoring recommendations`,
          },
        },
      ],
    })
  );

  // AI context building prompt
  server.registerPrompt(
    'build-context',
    {
      title: 'Build LLM Context',
      description: 'Build comprehensive context for an LLM task',
      argsSchema: {
        query: z.string().describe('What you need context for'),
        workspace_id: z.string().uuid().optional().describe('Workspace ID'),
        project_id: z.string().uuid().optional().describe('Project ID'),
        include_memory: z.string().optional().describe('Include memory/decisions ("true" or "false")'),
      },
    },
    async (args) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Build comprehensive context for the following task:

**Query:** ${args.query}

Please use \`ai.enhanced_context\` with:
- query: "${args.query}"
${args.workspace_id ? `- workspace_id: "${args.workspace_id}"` : ''}
${args.project_id ? `- project_id: "${args.project_id}"` : ''}
- include_code: true
- include_docs: true
- include_memory: ${args.include_memory ?? true}

Then synthesize the retrieved context into a coherent briefing that will help with the task.`,
          },
        },
      ],
    })
  );
}
