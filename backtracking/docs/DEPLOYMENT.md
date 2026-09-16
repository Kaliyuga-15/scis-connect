# Backtracking Arena — Deployment Guide 🚀

Production deployment instructions for a single-instance Linux server.

---

## 1. Server Requirements

| Component | Requirement |
|---|---|
| **OS** | Ubuntu 20.04+ / Debian 11+ (or any Linux with kernel 3.8+) |
| **Runtime** | Node.js 18+ (LTS recommended) |
| **Compiler** | GCC 11+ (`apt install gcc`) |
| **Sandbox** | bubblewrap (`apt install bubblewrap`) |
| **Database** | MongoDB 6+ (local or Atlas) |
| **RAM** | 2 GB minimum, 4 GB recommended |
| **CPU** | 2+ cores (judge concurrency scales with cores) |
| **Disk** | 1 GB free (for temp judge workdirs) |

## 2. Install System Dependencies

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y gcc bubblewrap nodejs npm

# Verify installations
gcc --version        # Should be 11+
bwrap --version      # Should be 0.4+
node --version       # Should be 18+
mongosh --version    # Should be 6+
```

## 3. Environment Variables

Create a `.env` file from the example:

```bash
cp .env.example .env
```

**Required variables:**

| Variable | Description | Example |
|---|---|---|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/scis-connect` |
| `ARENA_CONTEST_KEY` | Default contest key | `backtracking` |
| `ADMIN_USER_IDS` | Comma-separated admin user IDs | `admin1,admin2` |
| `JUDGE_CONCURRENCY` | Max parallel judge slots (default: CPU cores) | `4` |
| `JUDGE_SUBMIT_COOLDOWN_MS` | Cooldown between submissions (ms) | `5000` |
| `PORT` | Server port | `4000` |
| `JWT_SECRET` | JWT signing secret (production) | `your-secret-key` |

## 4. Build & Deploy

```bash
# Install dependencies
npm ci --production

# Build Next.js production bundle
npm run build

# Seed problems and contest (first time only)
npm run seed:problems
npm run seed:contest

# Start with PM2 (recommended for production)
pm2 start server.js --name backtracking-arena

# Or with systemd (see below)
```

## 5. systemd Service (Alternative to PM2)

Create `/etc/systemd/system/backtracking-arena.service`:

```ini
[Unit]
Description=Backtracking Arena
After=network.target mongod.service

[Service]
Type=simple
User=deploy
WorkingDirectory=/opt/backtracking-arena
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
EnvironmentFile=/opt/backtracking-arena/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable backtracking-arena
sudo systemctl start backtracking-arena
```

## 6. Pre-Contest Checklist

- [ ] MongoDB is running and accessible
- [ ] Problems are seeded (`npm run seed:problems`)
- [ ] Contest is created (`npm run seed:contest`)
- [ ] bubblewrap works: `bwrap --ro-bind / / /bin/echo hello`
- [ ] GCC works: `echo 'int main(){}' | gcc -x c -o /dev/null -`
- [ ] Admin can access `/admin` page
- [ ] Test submission works end-to-end
- [ ] Rate limiting is functioning (try rapid submits)
- [ ] Probe system responds correctly
- [ ] Leaderboard updates in real-time
- [ ] Firewall allows port 4000 (or your configured port)
- [ ] Set `NODE_ENV=production`

## 7. Monitoring

```bash
# Check process status
pm2 status

# View logs
pm2 logs backtracking-arena

# Monitor CPU/memory
pm2 monit
```

## 8. Troubleshooting

| Issue | Solution |
|---|---|
| `bwrap: No such file` | Install bubblewrap: `apt install bubblewrap` |
| `gcc: command not found` | Install GCC: `apt install gcc` |
| `ECONNREFUSED` on MongoDB | Ensure `mongod` is running |
| Judge timeouts | Increase `timeLimitMs` or check CPU load |
| Sandbox permission denied | Ensure kernel supports user namespaces: `sysctl kernel.unprivileged_userns_clone=1` |
