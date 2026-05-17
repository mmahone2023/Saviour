#!/usr/bin/env node
/**
 * preToolUse: remove Co-authored-by (and similar) from git commit shell commands.
 */
import { readFileSync } from 'node:fs';

const CO_AUTHOR_INLINE = /\s*Co-authored-by:\s*[^"\n]*/gi;
const TRAILER_FLAG_PATTERN = /\s--trailer\s+["']?[^"'\n]*[Cc]o-[Aa]uthored[^"'\n]*["']?/g;

function stripCoAuthorFromCommitMessage(command) {
  let next = command.replace(CO_AUTHOR_INLINE, '').replace(TRAILER_FLAG_PATTERN, '');
  next = next.replace(/\n{3,}/g, '\n\n');
  next = next.replace(/"\s+"/g, '" "');
  return next;
}

function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    console.log(JSON.stringify({ permission: 'allow' }));
    return;
  }

  if (input.tool_name !== 'Shell') {
    console.log(JSON.stringify({ permission: 'allow' }));
    return;
  }

  const command = input.tool_input?.command;
  if (typeof command !== 'string' || !/\bgit\s+commit\b/i.test(command)) {
    console.log(JSON.stringify({ permission: 'allow' }));
    return;
  }

  const stripped = stripCoAuthorFromCommitMessage(command);
  if (stripped === command) {
    console.log(JSON.stringify({ permission: 'allow' }));
    return;
  }

  console.log(
    JSON.stringify({
      permission: 'allow',
      updated_input: { ...input.tool_input, command: stripped },
      agent_message:
        'Co-authored-by trailers were removed from this git commit per project policy.',
    }),
  );
}

main();
