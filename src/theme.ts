/**
 * TUI theme — crow branding, colors, and styled output.
 * Provides consistent visual identity across the CLI.
 */
import chalk from 'chalk';

// ── Color palette ────────────────────────────────────────
const c = {
  body:    chalk.hex('#C8C8C8'),     // Light gray — feather body (%@)
  detail:  chalk.hex('#888888'),     // Mid gray — feather detail (#)
  edge:    chalk.hex('#555555'),     // Dark gray — edges (*+=)
  shadow:  chalk.hex('#333333'),     // Deep shadow (=+-)
  eye:     chalk.hex('#F59E0B'),     // Amber — crow eye
  accent:  chalk.hex('#8B5CF6'),     // Purple — brand accent
};

// ── Crow ASCII Art (colorized) ───────────────────────────
// Full-size crow mascot from the Crowcoder reference image
export function getCrowArt(): string {
  const lines = [
    '                                                                                                  *+',
    '                                                                                             *+++***',
    '                                                                                        %#**==*###  ',
    '                                                                +                  ##*++=*%%%%##    ',
    '                                                              #*+            %%##+=++#%@@@@%%#      ',
    '                                                             %#++       %%###+++++%@@@@@@@%%        ',
    '                                                            ###+*   #%##*##%%%%@@@%%@@@@%@    +++** ',
    '                                                          ####*=#%**###%@@@@@@@@@@@%%##+=++====+*   ',
    '                                                        #*****#++=#%@@@@@@@@@@%%##*=-+**#*+*###     ',
    '                                                     #*+=++*+:+####%%%%@@%%+=+%%@@@@@@@#%%%*#       ',
    '                                                 #**+-=**==**+==+++#%@@@@@@@@@@@@@@@@%%%##          ',
    '                                             #*#**+=***=+++=:+*%@@@@@@%%%##%@@@@@@@@%%#             ',
    '                                         ####**#*++++*+++#@@@@@@@%***=-+#%%@@@@@%##*++++***         ',
    '                                  *## ###*+==#+++++*%@@@@@@%#**+++*####*+++*##%##%%%%%##*#          ',
    '                                 +*#*##*===#++#%@@%#####%%%%@@@@@@@@@@@@@@@@@@@@@%%%%%##            ',
    '                                *+#*==--+#+--::-+*###%%%%%%%@@%@@@@@@@@@@@@@@%%%%%%#%               ',
    '                              *+*-:--=**%++*##%%##%%%%%%%%%%%%%%%%%@@%%@@@@@%%%#%                   ',
    '               ##***#******++++=*####*####%%%@@%%%@@@%@@@@@@%%%#**++++====+****#%###                ',
    '          %####***++=++*##%#=#%%*#*-:--+##%%%%%@@%=%@@@@@@%%@@@@@@@@@@@@@@@@@@%%%                   ',
    '       *###%+:-+*#%%%%%%*%**@%+#+::::::=*##*=+%@@@%=%@@@%@@@@@@@@@@@@@@@@@@%#%                      ',
    '    #%#%%%%#-=*###%%%%%@@%*%%#+::::-*%@%%%%@@@*+%@@%+%%%%%%@%@@@%%%%%%%%%%                          ',
    ' #**=+**@@@@@@@@@%*+*%%#@*@%%+-:::*@@@@@@@@@@@%#*%%%+###%@%%%##%%%%####*                            ',
    '#%#%%%%@@@@%@@@@@%%#%%+-%@@@%#---#@%#%%%+=#%#%##-*%#=#%@%%%%%########                               ',
    '         @@%@@@@@@%%@#*%+*%%===+%@#%%%%#:#%#*##%*#%++#*##**#*##%#*                                  ',
    '              @@@@@@@###+-+%+**#@@%%%%@@#+%%%%%#@%=#%%%%%##%*                                       ',
    '                 %@%*@@%*#*###%@@#%@@@@@@@*+#%#++#%@%%%%%                                           ',
    '                   %%*%@%%%###%@@%#%%@@@@@@@@@@%*###                                                ',
    '                      %%%%#%%%%@@@%%@@%@%@@%%%%#%#%#%%%                                             ',
    '                       #%%%%%%@@@@@@%%*%%##%%%#*+++****%%%####                                      ',
    '                         @@%@@@@@@@%%%%%#**%@%#*#*****###%#%                                        ',
    '                            %%%@@@@@@@@@%#%###%%#%%%%#####***##%#%%%#%                              ',
    '                               @%%@%%%=+%@%@@@@@@%***%%%##%#%%%%%@%%%%#                             ',
    '                                   %%*+#@##@@@@@@@@@%#+*%%%%%#****#####*##*                         ',
    '                                   %%*%@@%#%@@@%@@%%@@@@%#=#%%%%%%%##++++**####**++++++++           ',
    '                                    ####%%%%% @@%%%%#%@@%#%@%#=+*%%%%%%%%########***+*++*           ',
    '                                      %%%%%%    %%%%%#%@@@@%%@@@%%%##%%%%#%%#%%%%                   ',
    '                                                  %%%%%%%%%@@%%%%%%%%%%###%%%                       ',
    '                                                    %#  %%%%%%%*#  ####%%##**                       ',
    '                                                            %%###*                                  ',
  ];

  return lines.map(line => {
    // Colorize character by character
    return line.split('').map(ch => {
      if (ch === '@') return c.body(ch);
      if (ch === '%') return c.body(ch);
      if (ch === '#') return c.detail(ch);
      if (ch === '*') return c.edge(ch);
      if (ch === '+' || ch === '=') return c.shadow(ch);
      if (ch === '-' || ch === ':') return c.shadow(ch);
      return ch;
    }).join('');
  }).join('\n');
}

// ── Compact crow for banner use ──────────────────────────
export function getSmallCrow(): string {
  // Simplified 8-line crow silhouette
  return [
    c.detail('            ') + c.edge('*+'),
    c.detail('         ') + c.edge('*+++') + c.detail('***'),
    c.detail('     ') + c.body('%#') + c.detail('**') + c.edge('==') + c.detail('*###'),
    c.detail('   ##') + c.edge('*++=') + c.detail('*') + c.body('%%%%') + c.detail('##'),
    c.detail(' #') + c.edge('*+') + c.detail('  ') + c.body('%%') + c.detail('##') + c.edge('+=++') + c.detail('#') + c.body('%@@@@') + c.detail('%%#'),
    c.detail(' %#') + c.edge('++') + c.detail('  ') + c.body('%%') + c.detail('###') + c.edge('+++++') + c.body('%@@@@@@@') + c.detail('%%'),
    c.detail('  ###+') + c.edge('*') + c.detail(' #%##') + c.edge('*##') + c.body('%%%%@@@%%@@@@%@'),
    c.detail('    ####') + c.edge('*=') + c.detail('#%') + c.edge('**') + c.detail('###') + c.body('%@@@@@@@@@@@') + c.detail('%%##'),
  ].join('\n');
}

// ── Theme Colors ─────────────────────────────────────────
export const theme = {
  // Primary branding
  brand:       chalk.hex('#8B5CF6'),        // Purple — main brand
  brandBold:   chalk.hex('#8B5CF6').bold,
  brandDim:    chalk.hex('#6D28D9'),

  // Semantic colors
  success:     chalk.hex('#10B981'),         // Green
  warning:     chalk.hex('#F59E0B'),         // Amber
  error:       chalk.hex('#EF4444'),         // Red
  info:        chalk.hex('#3B82F6'),         // Blue

  // UI chrome
  header:      chalk.hex('#8B5CF6').bold,
  subheader:   chalk.hex('#A78BFA'),
  dim:         chalk.hex('#6B7280'),
  muted:       chalk.hex('#9CA3AF'),
  bright:      chalk.white.bold,

  // Special elements
  prompt:      chalk.hex('#10B981').bold,     // Green prompt
  toolName:    chalk.hex('#3B82F6'),          // Blue for tool names
  toolStatus:  chalk.hex('#10B981'),          // Green checkmarks
  toolError:   chalk.hex('#EF4444'),          // Red for errors
  cost:        chalk.hex('#6B7280'),          // Dim for cost info
  command:     chalk.hex('#F59E0B'),          // Amber for slash commands

  // Mode badges
  modeBadge: (mode: string): string => {
    const colors: Record<string, typeof chalk> = {
      dev:       chalk.bgHex('#10B981').black,
      review:    chalk.bgHex('#3B82F6').white,
      tdd:       chalk.bgHex('#EF4444').white,
      research:  chalk.bgHex('#8B5CF6').white,
      plan:      chalk.bgHex('#F59E0B').black,
      debug:     chalk.bgHex('#EF4444').white,
      architect: chalk.bgHex('#6366F1').white,
    };
    const colorFn = colors[mode] || chalk.bgGray.white;
    return colorFn(` ${mode.toUpperCase()} `);
  },

  // Security level badges
  secBadge: (level: string): string => {
    const colors: Record<string, typeof chalk> = {
      critical: chalk.bgRed.white.bold,
      high:     chalk.red.bold,
      medium:   chalk.hex('#F59E0B'),
      low:      chalk.hex('#6B7280'),
      safe:     chalk.hex('#10B981'),
    };
    return (colors[level] || chalk.white)(level.toUpperCase());
  },
};

// ── Banner ───────────────────────────────────────────────
export function printBanner(
  provider: string,
  model: string,
  mode: string,
  permissionMode: string,
  sessionId: string,
  toolNames: string[],
): void {
  console.log('');
  console.log(theme.brandBold('    ╔══════════════════════════════════════════════╗'));
  console.log(theme.brandBold('    ║') + theme.bright('        C R O W C O D E R                ') + theme.brandBold('║'));
  console.log(theme.brandBold('    ║') + theme.dim('     AI Coding Assistant for the Terminal  ') + theme.brandBold('║'));
  console.log(theme.brandBold('    ╚══════════════════════════════════════════════╝'));
  console.log('');
  console.log(theme.dim('  ┌─────────────────────────────────────────────┐'));
  console.log(theme.dim('  │') + theme.muted('  Provider  ') + theme.bright(pad(provider, 12)) + theme.muted('  Model  ') + theme.bright(truncate(model, 16)) + theme.dim('  │'));
  console.log(theme.dim('  │') + theme.muted('  Mode      ') + theme.modeBadge(mode) + ' '.repeat(Math.max(1, 12 - mode.length - 2)) + theme.muted('  Perms  ') + theme.bright(pad(permissionMode, 16)) + theme.dim('  │'));
  console.log(theme.dim('  │') + theme.muted('  Session   ') + theme.dim(pad(sessionId.slice(0, 12), 12)) + theme.muted('  CWD    ') + theme.dim(truncate(process.cwd(), 16)) + theme.dim('  │'));
  console.log(theme.dim('  ├─────────────────────────────────────────────┤'));
  console.log(theme.dim('  │') + theme.muted('  Tools: ') + theme.dim(pad(toolNames.join(', '), 36)) + theme.dim('  │'));
  console.log(theme.dim('  └─────────────────────────────────────────────┘'));
  console.log('');
  console.log(theme.dim('  Type ') + theme.command('/help') + theme.dim(' for commands, ') + theme.dim('Ctrl+C to exit'));
  console.log('');
}

// ── Crow Splash Screen ───────────────────────────────────
export function printSplash(): void {
  console.log(getCrowArt());
  console.log('');
  console.log(theme.brandBold('                                    C R O W C O D E R'));
  console.log(theme.dim('                              AI Coding Assistant for the Terminal'));
  console.log('');
}

// ── Styled helpers ───────────────────────────────────────

/** Print a section header */
export function printSection(title: string): void {
  console.log('');
  console.log(theme.header(`  ── ${title} ──`));
}

/** Print a key-value pair */
export function printKV(key: string, value: string, indent = 2): void {
  const padding = ' '.repeat(indent);
  console.log(padding + theme.muted(key.padEnd(14)) + theme.bright(value));
}

/** Print a tool execution line */
export function printToolRun(name: string, args: string): void {
  console.log(theme.toolName(`  ▶ ${name}`) + theme.dim(` ${args}`));
}

/** Print a tool result line */
export function printToolResult(success: boolean, elapsed: number, output: string): void {
  const icon = success ? theme.toolStatus('✓') : theme.toolError('✗');
  const time = theme.dim(`(${elapsed}ms)`);
  const preview = output.length > 200
    ? theme.dim(output.slice(0, 150) + '...')
    : theme.dim(output);
  console.log(`  ${icon} ${time} ${preview}`);
}

/** Print a cost/token line */
export function printCost(prompt: number, completion: number, cost: number, warning?: string): void {
  process.stdout.write(
    theme.cost(`\n[${prompt}→${completion} tokens | $${cost.toFixed(4)}]`),
  );
  if (warning) {
    console.log(theme.warning(`\n  ⚠ ${warning}`));
  }
}

/** Print a security warning */
export function printSecurityBadge(level: string, threats: string[], blocked: boolean): void {
  console.log(`  ⚠ Security: ${theme.secBadge(level)}`);
  for (const t of threats) {
    console.log(theme.warning(`    ${t}`));
  }
  if (blocked) {
    console.log(chalk.bgRed.white('    BLOCKED — this operation was prevented.'));
  }
}

/** Print a divider */
export function printDivider(): void {
  console.log(theme.dim('  ─────────────────────────────────────'));
}

/** Progress spinner text */
export function spinner(text: string): string {
  return theme.dim(`  ⟳ ${text}`);
}

// ── Utilities ────────────────────────────────────────────
function truncate(str: string, max: number): string {
  if (str.length <= max) return str.padEnd(max);
  return str.slice(0, max - 1) + '…';
}

function pad(str: string, len: number): string {
  return str.slice(0, len).padEnd(len);
}
