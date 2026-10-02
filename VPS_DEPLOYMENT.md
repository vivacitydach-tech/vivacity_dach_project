# 🚀 Target Enterprise - Production VPS Deployment Guide

Deploy the complete **Target Enterprise Construction Platform** on any Linux Virtual Private Server (VPS) — including **Ubuntu 22.04 / 24.04 LTS, Debian 12, Hetzner, DigitalOcean, AWS EC2, Linode, or Contabo**.

---

## ⚡ Quick 1-Command Automated Deployment

Connect to your VPS via SSH and run this single command:

```bash
curl -fsSL https://raw.githubusercontent.com/vivacitydach-tech/vivacity_dach_project/main/scripts/vps-deploy.sh | sudo bash
```

### What this script does automatically:
1. Installs **Docker Engine** & **Docker Compose** plugin.
2. Configures **UFW Firewall** (Port 22 SSH, Port 80 HTTP, Port 443 HTTPS).
3. Clones the repository to `/opt/target-enterprise`.
4. Generates a secure, randomized production `.env.docker` file.
5. Builds and starts all 8 production containers.
6. Seeds demo workspace accounts.

---

## 🔒 Optional: Add Free HTTPS SSL (Let's Encrypt)

If you have a domain name (e.g. `construction.yourdomain.com`) pointing to your VPS IP:

```bash
cd /opt/target-enterprise
sudo chmod +x scripts/vps-ssl.sh
sudo ./scripts/vps-ssl.sh yourdomain.com admin@yourdomain.com
```

---

## 🤖 Optional: Automated Continuous Deployment (GitHub Actions CD)

To have your VPS automatically update whenever you push changes to GitHub:

1. In your GitHub repository, go to **Settings** ➔ **Secrets and variables** ➔ **Actions**.
2. Add the following repository secrets:
   - `VPS_HOST`: Your VPS public IP address (e.g., `123.45.67.89`)
   - `VPS_USER`: `root` (or your sudo user)
   - `VPS_SSH_KEY`: Private SSH key configured on your server
   - `VPS_PORT`: `22` (default)
3. In `.github/workflows/cd.yml`, change `if: false` to `if: true`.

---

## 🛠️ Management & Maintenance Cheat Sheet

| Action | Command (inside `/opt/target-enterprise`) |
| :--- | :--- |
| **Check Container Status** | `docker compose --env-file .env.docker ps` |
| **View Live Logs** | `docker compose --env-file .env.docker logs -f` |
| **Restart Stack** | `docker compose --env-file .env.docker restart` |
| **Pull & Apply Updates** | `git pull origin main && docker compose --env-file .env.docker up -d --build` |
| **Database Backup** | `docker exec target-enterprise-mysql-1 mysqldump -u root -p<root_pass> target_db > backup_$(date +%F).sql` |

---

## 🔑 Default Production Access

- **Web Portal**: `http://<your-vps-ip>/`
- **Field Engineer Mobile PWA**: `http://<your-vps-ip>/field/`
- **Interactive API Docs**: `http://<your-vps-ip>/v1/docs`

**Default Admin Credentials**:
- **Email**: `pm@target.local`
- **Password**: `Target2026!Demo`
