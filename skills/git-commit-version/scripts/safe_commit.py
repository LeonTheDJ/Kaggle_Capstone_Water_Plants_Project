import sys
import os
import subprocess
import re

def run_command(command, shell=False):
    result = subprocess.run(command, capture_output=True, shell=shell)
    stdout = result.stdout.decode('utf-8', errors='ignore')
    stderr = result.stderr.decode('utf-8', errors='ignore')
    return result.returncode, stdout, stderr

def print_warning(message):
    print("=" * 60)
    print("WARNING: SAFETY CHECK FAILED!")
    print("=" * 60)
    print(message)
    print("=" * 60)

def main():
    if len(sys.argv) < 2:
        print("Usage: python safe_commit.py <commit_message> [--breaking]")
        sys.exit(1)

    commit_msg = sys.argv[1]
    is_breaking = "--breaking" in sys.argv or commit_msg.startswith("!")

    # Format the commit message
    if is_breaking:
        if not commit_msg.startswith("!"):
            commit_msg = f"! {commit_msg}"
    else:
        # Check if the commit message has a prefix like type: description
        # if not, warn the user, but we can allow it or enforce it
        pass

    # 1. Check if .env is tracked by Git
    returncode, stdout, stderr = run_command(["git", "ls-files", "--error-unmatch", ".env"])
    if returncode == 0:
        print_warning("The sensitive file '.env' is being tracked by Git!\n"
                      "Please remove it from tracking first: git rm --cached .env")
        sys.exit(1)

    # 2. Get all staged files
    returncode, stdout, stderr = run_command(["git", "diff", "--cached", "--name-only"])
    if returncode != 0:
        print(f"Error running git diff: {stderr}")
        sys.exit(1)

    staged_files = stdout.strip().splitlines()
    if not staged_files:
        print("No staged changes to commit.")
        sys.exit(0)

    # 3. Check staged changes for secrets and absolute paths
    failures = []
    
    # Check for absolute path patterns
    abs_path_pattern = re.compile(r"[a-zA-Z]:[/\\]Users[/\\][a-zA-Z0-9_\-\.]+", re.IGNORECASE)
    
    # Check for hardcoded API key / secrets patterns
    # Matches patterns like GEMINI_API_KEY="AIza..." or GEMINI_API_KEY='...'
    secret_patterns = [
        re.compile(r"GEMINI_API_KEY\s*=\s*[\"'](AQ\.[a-zA-Z0-9_\-]+)[\"']", re.IGNORECASE),
        re.compile(r"api_key\s*=\s*[\"'](AQ\.[a-zA-Z0-9_\-]+)[\"']", re.IGNORECASE),
    ]

    for file in staged_files:
        if not os.path.exists(file):
            continue
            
        # Get only the staged diff to scan what is actually being added
        code, diff_out, diff_err = run_command(["git", "diff", "--cached", file])
        if code != 0:
            continue

        # Look at added lines (starting with '+')
        added_lines = [line[1:] for line in diff_out.splitlines() if line.startswith("+") and not line.startswith("+++")]

        for line_num, line in enumerate(added_lines, 1):
            # Check for absolute paths
            if abs_path_pattern.search(line):
                failures.append(f"Absolute path found in {file} (added line: {line.strip()})")
            
            # Check for secrets
            for pattern in secret_patterns:
                if pattern.search(line):
                    failures.append(f"Potential hardcoded API key or secret found in {file} (added line: {line.strip()})")

    if failures:
        print_warning("\n".join(failures))
        print("Commit aborted. Please fix the issues above and try again.")
        sys.exit(1)

    print("Safety checks passed successfully.")
    print(f"Running git commit with message: '{commit_msg}'")

    # Run the commit
    code, out, err = run_command(["git", "commit", "-m", commit_msg])
    if code == 0:
        print(out)
        print("Commit successful!")
    else:
        print(f"Commit failed:\n{err}\n{out}")
        sys.exit(code)

if __name__ == "__main__":
    main()
