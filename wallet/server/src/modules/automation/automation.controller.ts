import { Request, Response } from 'express';
import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ----------------------------
// TYPES
// ----------------------------
interface Rule {
  id: number;
  chain: string;
  type: string;
  active: boolean;
  targetBalance?: string;
  [key: string]: any; 
}

const RULES_FILE = join(__dirname, 'automationRules.json');

// ----------------------------
// FILE HELPERS
// ----------------------------
async function readRules(): Promise<Rule[]> {
  try {
    const data = await readFile(RULES_FILE, 'utf-8');
    return JSON.parse(data) as Rule[];
  } catch {
    return [];
  }
}

async function writeRules(rules: Rule[]): Promise<void> {
  await writeFile(RULES_FILE, JSON.stringify(rules, null, 2), 'utf-8');
}

// ----------------------------
// CONTROLLERS
// ----------------------------

// GET all rules - Using req to signal intentional unused parameter
export async function getRules(_req: Request, res: Response) {
  try {
    const rules = await readRules();
    res.json({ success: true, rules });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// ADD a new rule
export async function addRule(req: Request, res: Response) {
  try {
    const newRule = req.body as Partial<Rule>;

    if (!newRule.chain || !newRule.type) {
      return res.status(400).json({ success: false, error: 'chain and type required' });
    }

    const rules = await readRules();
    const id = rules.length ? rules[rules.length - 1].id + 1 : 1;

    const rule: Rule = {
      id,
      chain: newRule.chain,
      type: newRule.type,
      active: true,
      targetBalance: newRule.targetBalance,
      ...newRule
    };

    rules.push(rule);
    await writeRules(rules);

    res.json({ success: true, rule });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// UPDATE a rule
export async function updateRule(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const updates = req.body as Partial<Rule>;

    const rules = await readRules();
    const index = rules.findIndex((r: Rule) => r.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Rule not found' });
    }

    rules[index] = { ...rules[index], ...updates };
    await writeRules(rules);

    res.json({ success: true, updated: rules[index] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// DELETE a rule - req is used here for req.params.id
export async function deleteRule(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);

    const rules = await readRules();
    const index = rules.findIndex((r: Rule) => r.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Rule not found' });
    }

    const deleted = rules.splice(index, 1)[0];
    await writeRules(rules);

    res.json({ success: true, deleted });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
