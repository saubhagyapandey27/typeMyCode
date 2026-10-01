import os
import re
import json

SOURCE_DIR = r"D:\Workspace\PLACEMENTS_2027\sde_sheet\master-pattern-markdowns"
OUTPUT_JS = os.path.join(os.path.dirname(__file__), "sde_sheet_data.js")

def parse_markdown_files():
    files = sorted([f for f in os.listdir(SOURCE_DIR) if f.endswith('.md') and f != 'README.md'])
    
    patterns = []
    all_problems = []
    global_id = 0

    for f in files:
        path = os.path.join(SOURCE_DIR, f)
        with open(path, 'r', encoding='utf-8') as fp:
            content = fp.read()
        
        m_pattern = re.search(r'^#\s+Pattern\s+(\d+):\s*(.+)$', content, re.MULTILINE)
        p_num = int(m_pattern.group(1)) if m_pattern else int(f.split('_')[0])
        p_name = m_pattern.group(2).strip() if m_pattern else f.replace('.md', '')
        
        parts = re.split(r'\n(?=## Problem \d+:)', content)
        pattern_problem_ids = []
        
        for part in parts[1:]:
            m_prob = re.search(r'^## Problem (\d+):\s*(.+)$', part, re.MULTILINE)
            if not m_prob:
                continue
            prob_seq = int(m_prob.group(1))
            raw_title = m_prob.group(2).strip()
            
            # Difficulty
            m_diff = re.search(r'\[(Easy|Medium|Hard)\]', raw_title, re.IGNORECASE)
            difficulty = m_diff.group(1).capitalize() if m_diff else 'Medium'
            
            # Canonical name
            m_canonical = re.search(r'-\s*\*\*Canonical Name:\*\*\s*(.+)', part)
            canonical_name = m_canonical.group(1).strip() if m_canonical else raw_title
            
            # Clean title (without [Easy]/[Medium]/[Hard])
            cleaned_title = re.sub(r'\s*\[(Easy|Medium|Hard)\]', '', raw_title).strip()
            
            # LeetCode / TakeUForward links
            leetcode_link = ''
            tuf_link = ''
            m_lc = re.search(r'\[LeetCode[^\]]*\]\((https?://[^\)]+)\)', part)
            if m_lc:
                leetcode_link = m_lc.group(1)
            m_tuf = re.search(r'\[TakeUForward[^\]]*\]\((https?://[^\)]+)\)', part)
            if m_tuf:
                tuf_link = m_tuf.group(1)
            
            # Complexity bounds
            m_bounds = re.search(r'\*\*Asymptotic Bounds:\*\*\s*([^\n\r]+)', part)
            bounds = m_bounds.group(1).strip() if m_bounds else ''
            
            # Mantra
            mantra_lines = []
            in_mantra = False
            for line in part.splitlines():
                if 'Master Solution Mantra' in line:
                    in_mantra = True
                    continue
                if in_mantra:
                    if line.startswith('###') or line.startswith('---'):
                        break
                    mantra_cleaned = line.lstrip('> ').strip()
                    if 'Asymptotic Bounds:' in mantra_cleaned:
                        continue
                    if mantra_cleaned:
                        mantra_lines.append(mantra_cleaned)
            mantra = '\n'.join(mantra_lines)

            # C++ code
            cpp_match = re.search(r'#### C\+\+[\s\S]*?```(?:cpp|c\+\+)?\r?\n([\s\S]*?)\r?\n```', part)
            cpp_code = cpp_match.group(1).strip() if cpp_match else ''
            
            # Python code
            py_match = re.search(r'#### Python[\s\S]*?```(?:python|py)?\r?\n([\s\S]*?)\r?\n```', part)
            py_code = py_match.group(1).strip() if py_match else ''
            
            global_id += 1
            prob_obj = {
                'id': global_id,
                'patternId': p_num,
                'patternName': p_name,
                'problemSeq': prob_seq,
                'title': cleaned_title,
                'canonicalName': canonical_name,
                'difficulty': difficulty,
                'bounds': bounds,
                'mantra': mantra,
                'leetcode': leetcode_link,
                'tuf': tuf_link,
                'cpp': cpp_code,
                'py': py_code
            }
            all_problems.append(prob_obj)
            pattern_problem_ids.append(global_id)
            
        patterns.append({
            'id': p_num,
            'name': p_name,
            'count': len(pattern_problem_ids),
            'problemIds': pattern_problem_ids
        })
        
    db = {
        'totalPatterns': len(patterns),
        'totalProblems': len(all_problems),
        'patterns': patterns,
        'problems': all_problems
    }
    
    # Write to sde_sheet_data.js
    with open(OUTPUT_JS, 'w', encoding='utf-8') as fp:
        fp.write("// Striver's SDE Sheet Problem Database (191 Problems across 16 Patterns)\n")
        fp.write("// Auto-generated from D:\\Workspace\\PLACEMENTS_2027\\sde_sheet\\master-pattern-markdowns\n")
        fp.write("window.SDE_SHEET_DATA = ")
        json.dump(db, fp, indent=2, ensure_ascii=False)
        fp.write(";\n")
        
    print(f"Successfully generated {OUTPUT_JS}")
    print(f"Total Patterns: {len(patterns)}")
    print(f"Total Problems: {len(all_problems)}")
    for p in patterns:
        print(f"  Pattern {p['id']:02d}: {p['name']} ({p['count']} problems)")

if __name__ == '__main__':
    parse_markdown_files()
