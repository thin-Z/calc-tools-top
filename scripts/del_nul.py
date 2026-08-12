# -*- coding: utf-8 -*-
"""遗留1：尝试删除 Windows 保留名文件 nul（多种 API + 详细错误）"""
import os, ctypes, sys

p = r"D:\_Careate.Program\calculator-site\nul"
dev = r"\\?\D:\_Careate.Program\calculator-site\nul"

# 1) 常规 os.remove
try:
    os.remove(p)
    print("1 os.remove: OK")
except Exception as e:
    print("1 os.remove FAIL:", repr(e))

# 2) os.remove + \\?\ 前缀
try:
    os.remove(dev)
    print("2 os.remove devpath: OK")
except Exception as e:
    print("2 os.remove devpath FAIL:", repr(e))

# 3) ctypes DeleteFileW + \\?\
try:
    r = ctypes.windll.kernel32.DeleteFileW(dev)
    print("3 DeleteFileW:", "OK" if r else "FAIL err=" + str(ctypes.get_last_error()))
except Exception as e:
    print("3 DeleteFileW FAIL:", repr(e))

# 4) MoveFileExW 到临时名再删（有时能绕过）
try:
    tmp = r"\\?\D:\_Careate.Program\calculator-site\.nul-tmp-del"
    r = ctypes.windll.kernel32.MoveFileExW(dev, tmp, 0x4)  # MOVEFILE_REPLACE_EXISTING
    print("4 MoveFileExW:", "OK" if r else "FAIL err=" + str(ctypes.get_last_error()))
    if r:
        os.remove(tmp)
        print("   cleanup tmp OK")
except Exception as e:
    print("4 MoveFileExW FAIL:", repr(e))

# 5) 检查是否存在
print("exists:", os.path.exists(p))
