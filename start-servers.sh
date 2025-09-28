#!/bin/bash

# Keluarga Silsilah - Server Management Script

case "$1" in
    start)
        echo "🚀 Starting Keluarga Silsilah servers in detached mode..."
        
        # Start backend
        echo "Starting backend server..."
        cd /root/keluarga/backend
        nohup ./venv/bin/python -m uvicorn keluarga_backend.main:app --reload --port 8000 --host 0.0.0.0 > backend.log 2>&1 &
        BACKEND_PID=$!
        
        # Start frontend  
        echo "Starting frontend server..."
        cd /root/keluarga/frontend
        nohup npm run dev > frontend.log 2>&1 &
        FRONTEND_PID=$!
        
        sleep 3
        echo "✅ Servers started!"
        echo "   Backend:  http://localhost:8000 (API)"
        echo "   Frontend: http://localhost:1420 (UI)"
        echo "   API Docs: http://localhost:8000/docs"
        ;;
        
    stop)
        echo "🛑 Stopping Keluarga Silsilah servers..."
        pkill -f "uvicorn.*keluarga_backend" && echo "Backend stopped"
        pkill -f "vite" && pkill -f "npm run dev" && echo "Frontend stopped"
        ;;
        
    status)
        echo "📊 Server Status:"
        echo "Backend:"
        ps aux | grep "uvicorn.*keluarga_backend" | grep -v grep || echo "  ❌ Not running"
        echo "Frontend:"
        ps aux | grep -E "(vite|npm run dev)" | grep -v grep || echo "  ❌ Not running"
        echo ""
        echo "Port Status:"
        lsof -i tcp:8000 2>/dev/null && echo "  ✅ Backend on port 8000" || echo "  ❌ Port 8000 not in use"
        lsof -i tcp:1420 2>/dev/null && echo "  ✅ Frontend on port 1420" || echo "  ❌ Port 1420 not in use"
        ;;
        
    logs)
        case "$2" in
            backend)
                echo "📋 Backend logs (last 20 lines):"
                tail -20 /root/keluarga/backend/backend.log
                ;;
            frontend)
                echo "📋 Frontend logs (last 20 lines):"
                tail -20 /root/keluarga/frontend/frontend.log
                ;;
            *)
                echo "Usage: $0 logs [backend|frontend]"
                ;;
        esac
        ;;
        
    *)
        echo "🌳 Keluarga Silsilah - Server Management"
        echo "Usage: $0 {start|stop|status|logs}"
        echo ""
        echo "Commands:"
        echo "  start   - Start both servers in detached mode" 
        echo "  stop    - Stop both servers"
        echo "  status  - Check server status and ports"
        echo "  logs    - View server logs (backend|frontend)"
        echo ""
        echo "URLs when running:"
        echo "  Frontend: http://localhost:1420"
        echo "  Backend:  http://localhost:8000"
        echo "  API Docs: http://localhost:8000/docs"
        ;;
esac