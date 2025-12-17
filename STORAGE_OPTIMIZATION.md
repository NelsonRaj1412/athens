# Storage Optimization Guide

## Current Status
- **Total Size**: 8.6GB (reduced from 8.7GB)
- **Backup cleanup**: Removed 99MB backup file

## Completed Actions
✅ Created root `.gitignore` with venv and node_modules exclusions  
✅ Verified backend `.gitignore` includes `venv/`  
✅ Verified frontend `.gitignore` includes `node_modules`  
✅ Removed large backup file (99MB)  
✅ Created `cleanup_project.sh` script  

## Major Space Consumers
1. **backend/venv/** - 7.3GB (PyTorch + CUDA libraries)
2. **frontedn/node_modules/** - 1.1GB (Node.js dependencies)
3. **backend/media/** - 113MB (after backup cleanup)

## Quick Cleanup Commands
```bash
# Full cleanup (removes venv and node_modules)
./cleanup_project.sh

# Restore dependencies
cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt
cd ../frontedn && npm install
```

## Optional Optimizations
- Use CPU-only PyTorch: `pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu`
- Docker deployment instead of local venv
- Cloud storage for media files
- Automated backup cleanup policy