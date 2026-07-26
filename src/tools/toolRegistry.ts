import type { ToolDefinition } from '../types/agent.types.js';

class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition) {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Converts registered tools into the JSON-schema "function" format
   * OpenAI's chat.completions `tools` param expects.
   */
  toOpenAITools(names: string[]) {
    return names
      .map((name) => this.tools.get(name))
      .filter((tool): tool is ToolDefinition => Boolean(tool))
      .map((tool) => ({
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      }));
  }

  async execute(name: string, args: Record<string, unknown>): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" is not registered`);
    }
    return tool.execute(args);
  }
}

export const toolRegistry = new ToolRegistry();
