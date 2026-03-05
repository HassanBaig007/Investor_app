#!/usr/bin/env python3
"""
Comprehensive fix script for MAIN_README.md encoding and factual errors.
Fixes:
  - '?' placeholders restoring correct Unicode (em-dash —, box-drawing |)
  - Permission matrix: correct ✅ / ❌ per permissions.js logic
  - '21 screens' → '20 screens'
  - Remove ClientDashboard from screen table and project structure tree
"""

import re

FILE = r"c:\Users\Hassa\Documents\Magnus_Copo_documents\Magnus_Copo_Workspace_Files\Split_flow_final_prod\MAIN_README.md"

# ──────────────────────────────────────────────────────────────
# Permission matrix: correct values from permissions.js
# Columns: investor | project_admin | admin | super_admin
# ──────────────────────────────────────────────────────────────
# ✅ = allowed, ❌ = not allowed
PERMISSION_FIXES = {
    "view_portfolio":          ("✅", "✅", "✅", "✅"),
    "view_investments":        ("✅", "✅", "✅", "✅"),
    "view_reports":            ("✅", "✅", "✅", "✅"),
    "view_analytics":          ("✅", "✅", "✅", "✅"),
    "create_project":          ("✅", "✅", "✅", "✅"),
    "view_project_details":    ("✅", "✅", "✅", "✅"),
    "vote_on_modifications":   ("✅", "✅", "✅", "✅"),
    "view_approval_chain":     ("✅", "✅", "✅", "✅"),
    # Combined row uses "view_profile" as key fragment
    "view_profile":            ("✅", "✅", "✅", "✅"),
    "add_investor":            ("❌", "✅", "✅", "✅"),
    "remove_investor":         ("❌", "✅", "✅", "✅"),
    "view_investor_list":      ("❌", "✅", "✅", "✅"),
    "edit_project":            ("❌", "✅", "✅", "✅"),
    "create_modification":     ("❌", "✅", "✅", "✅"),
    "view_admin_stats":        ("❌", "❌", "✅", "✅"),
    "manage_users":            ("❌", "❌", "✅", "✅"),
    "send_announcements":      ("❌", "❌", "✅", "✅"),
    "update_market_data":      ("❌", "❌", "❌", "✅"),
}

def fix_permission_row(line):
    """Replace ✅/❌ placeholders in a permission table row."""
    for perm_key, (inv, pa, adm, sa) in PERMISSION_FIXES.items():
        if perm_key in line:
            # Replace all 4 '?' cells with the correct values
            new_line = re.sub(
                r'\| \? \| \? \| \? \| \? \|',
                f'| {inv} | {pa} | {adm} | {sa} |',
                line
            )
            if new_line != line:
                return new_line
    return line

def fix_code_block_line(line):
    """Fix ? characters in code block lines:
    - Line-initial ? → |
    - Line-terminal ? → |
    - Inline ' ? ' between content → ' — '
    """
    # Handle the tree-style lines that start with ? (box vertical)
    # Pattern: line starts with optional spaces then ?
    # But we want to preserve lines that start with spaces + ? (tree branches)
    result = line

    # Line-initial ? (possibly with leading spaces and then ? at tree position)
    # Replace standalone ? at start of content (tree vertical bar)
    # e.g. "?   +-- screens/" → "|   +-- screens/"
    result = re.sub(r'^(\s*)\?(\s+\+--)', r'\1|\2', result)
    result = re.sub(r'^(\s*)\?(\s+\?)(\s+\+--)', r'\1|\2|\3', result)

    # Line starting with ? but no +-- after (just vertical continuation or box border)
    result = re.sub(r'^(\s*)\?(\s*)$', r'\1|\2', result)
    result = re.sub(r'^\?(\s{2,})', r'|\1', result)

    # Line-terminal ? (box border on right side)
    result = re.sub(r'(\s)\?$', r'\1|', result)

    # Replace multiple consecutive ?  (e.g. "???" for horizontal triple vertical)
    # In practice this is the ? at start of multi-level tree
    result = re.sub(r'^(\s*)\?(\s+)\?(\s+)\?(\s+)', r'\1|\2|\3|\4', result)
    result = re.sub(r'^(\s*)\?(\s+)\?(\s+)', r'\1|\2|\3', result)
    result = re.sub(r'^(\s*)\?(\s+)', r'\1|\2', result)  # remaining single ?

    # Inline ' ? ' (em-dash context in code block content)
    result = re.sub(r' \? ', ' — ', result)

    # Trailing ? on content lines (right border of box diagram)
    result = re.sub(r'\?$', '|', result)

    return result

def fix_prose_line(line):
    """Fix ? in prose/table lines outside code blocks."""
    # Title: specific fix
    if line.startswith('# INVESTFLOW ?') or '? Private Investment' in line:
        return line.replace('? Private Investment', '— Private Investment')

    # Table rows: skip if looks like a permission matrix row (handled above)
    # For other prose:  ' ? ' → ' — '
    result = re.sub(r' \? ', ' — ', line)

    # Markdown bold + em-dash: '**text** ? rest' stays ' — ' style
    return result

def process_file(content):
    lines = content.split('\n')
    in_code_block = False
    in_permission_matrix = False
    result = []

    for i, line in enumerate(lines):
        stripped = line.rstrip()

        # Toggle code block state on ``` markers
        if stripped.startswith('```'):
            in_code_block = not in_code_block
            result.append(line)
            continue

        # Track permission matrix (comes after "### Permission Matrix")
        if '### Permission Matrix' in line:
            in_permission_matrix = True
        # End of permission matrix: next ## heading
        if in_permission_matrix and line.startswith('##') and 'Permission' not in line:
            in_permission_matrix = False

        if in_code_block:
            fixed = fix_code_block_line(line)
            result.append(fixed)
        elif in_permission_matrix and line.startswith('| `'):
            # Permission matrix data row
            fixed = fix_permission_row(line)
            result.append(fixed)
        else:
            fixed = fix_prose_line(line)
            result.append(fixed)

    return '\n'.join(result)

def apply_specific_fixes(content):
    """Apply exact targeted fixes."""

    # ── Fix title ──────────────────────────────────────────────
    content = content.replace(
        '# INVESTFLOW ? Private Investment Portfolio Management Platform',
        '# INVESTFLOW — Private Investment Portfolio Management Platform'
    )

    # ── Fix '21 screens' → '20 screens' ───────────────────────
    content = content.replace(
        'all 21 screens are in one',
        'all 20 screens are in one'
    )

    # ── Remove ClientDashboard row from screen table ───────────
    # The row starts with | `ClientDashboard`
    lines = content.split('\n')
    filtered = [
        ln for ln in lines
        if not (ln.strip().startswith('| `ClientDashboard`') and 'ClientDashboard.js' in ln)
    ]
    content = '\n'.join(filtered)

    # ── Remove ClientDashboard.js from project structure tree ──
    lines = content.split('\n')
    filtered = [
        ln for ln in lines
        if not ('ClientDashboard.js' in ln and '+--' in ln)
    ]
    content = '\n'.join(filtered)

    return content

def main():
    # Read file as UTF-8
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    print(f"Read {len(content)} bytes, {content.count(chr(10))+1} lines")
    print(f"'?' count before: {content.count('?')}")

    # Apply specific targeted fixes first
    content = apply_specific_fixes(content)

    # Apply line-level fixes
    content = process_file(content)

    print(f"'?' count after:  {content.count('?')}")

    # Verify key sections
    title_line = content.split('\n')[0]
    print(f"Title: {title_line}")

    # Check permission matrix section
    perm_start = content.find('### Permission Matrix')
    if perm_start != -1:
        excerpt = content[perm_start:perm_start+800]
        # Count ✅ and ❌
        yes = excerpt.count('✅')
        no  = excerpt.count('❌')
        q   = sum(1 for ln in excerpt.split('\n') if ln.startswith('| `') and '?' in ln)
        print(f"Permission matrix: ✅={yes}, ❌={no}, remaining ?-cells={q}")

    # Check nav tree
    nav_start = content.find('### 7.1 Navigation Structure')
    if nav_start != -1:
        excerpt = content[nav_start:nav_start+1200]
        bars = excerpt.count('|')
        qs   = excerpt.count('?')
        print(f"Nav tree: | count={bars}, remaining ?={qs}")

    # Write back
    with open(FILE, 'w', encoding='utf-8', newline='') as f:
        f.write(content)

    print("Done — file written.")

if __name__ == '__main__':
    main()
