# 🚀 Guía de Despliegue

Guía completa para desplegar el Sistema de Monitoreo de Desempeño Inmobiliario en diferentes entornos.

## 📋 Prerrequisitos

### **Servidor de Producción**
- **OS**: Ubuntu 20.04+ / CentOS 8+ / RHEL 8+
- **RAM**: Mínimo 2GB, recomendado 4GB+
- **CPU**: Mínimo 2 cores, recomendado 4+ cores
- **Disco**: Mínimo 20GB SSD
- **Red**: Puerto 5000 abierto (o el que configures)

### **Servicios Requeridos**
- **Node.js**: 18.0+ (recomendado 18.17+)
- **MongoDB**: 6.0+ (recomendado 6.0+)
- **Redis**: 7.0+ (opcional pero recomendado)
- **Nginx**: 1.18+ (para reverse proxy)

## 🐳 Despliegue con Docker

### **1. Preparar Archivos**

#### **Dockerfile**
```dockerfile
FROM node:18-alpine

# Instalar dependencias del sistema
RUN apk add --no-cache dumb-init

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependencias
RUN npm ci --only=production && npm cache clean --force

# Copiar código fuente
COPY . .

# Generar cliente Prisma
RUN npx prisma generate

# Cambiar ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Exponer puerto
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Comando de inicio
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "index.js"]
```

#### **docker-compose.yml**
```yaml
version: '3.8'

services:
  app:
    build: .
    container_name: rendimiento-backend
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
      - DATABASE_URL=mongodb://mongo:27017/rendimiento_inmobiliaria
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - RATE_LIMIT_WINDOW_MS=900000
      - RATE_LIMIT_MAX_REQUESTS=100
      - DB_CONNECTION_LIMIT=20
    depends_on:
      mongo:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./logs:/app/logs
    networks:
      - rendimiento-network

  mongo:
    image: mongo:6
    container_name: rendimiento-mongo
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_ROOT_PASSWORD}
      - MONGO_INITDB_DATABASE=rendimiento_inmobiliaria
    volumes:
      - mongo_data:/data/db
      - ./mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - rendimiento-network

  redis:
    image: redis:7-alpine
    container_name: rendimiento-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - rendimiento-network

  nginx:
    image: nginx:alpine
    container_name: rendimiento-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    networks:
      - rendimiento-network

volumes:
  mongo_data:
  redis_data:

networks:
  rendimiento-network:
    driver: bridge
```

#### **nginx.conf**
```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server app:5000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=1r/s;

    server {
        listen 80;
        server_name tu-dominio.com;

        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name tu-dominio.com;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
        ssl_prefer_server_ciphers off;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

        # Rate limiting
        location /api/auth/ {
            limit_req zone=auth burst=5 nodelay;
            proxy_pass http://backend;
        }

        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend;
        }

        # Health checks (sin rate limiting)
        location /api/health {
            proxy_pass http://backend;
        }

        # Proxy configuration
        location / {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
        }
    }
}
```

### **2. Variables de Entorno**

Crear archivo `.env`:
```env
# JWT
JWT_SECRET=tu-secreto-super-seguro-de-al-menos-64-caracteres-para-produccion

# Gemini AI
GEMINI_API_KEY=tu-api-key-de-google-gemini

# MongoDB
MONGO_ROOT_PASSWORD=password-super-seguro-para-mongo

# Redis
REDIS_PASSWORD=password-super-seguro-para-redis
```

### **3. Desplegar**

```bash
# Construir y desplegar
docker-compose up -d --build

# Ver logs
docker-compose logs -f

# Verificar estado
docker-compose ps
```

## ☸️ Despliegue con Kubernetes

### **1. Namespace**
```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: rendimiento-inmobiliaria
```

### **2. ConfigMap**
```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rendimiento-config
  namespace: rendimiento-inmobiliaria
data:
  NODE_ENV: "production"
  PORT: "5000"
  RATE_LIMIT_WINDOW_MS: "900000"
  RATE_LIMIT_MAX_REQUESTS: "100"
  DB_CONNECTION_LIMIT: "20"
  DB_POOL_TIMEOUT: "10000"
  DB_CONNECT_TIMEOUT: "10000"
  DB_QUERY_TIMEOUT: "30000"
  DB_MAX_RETRIES: "3"
  DB_RETRY_DELAY: "1000"
```

### **3. Secrets**
```yaml
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: rendimiento-secrets
  namespace: rendimiento-inmobiliaria
type: Opaque
data:
  DATABASE_URL: <base64-encoded-mongodb-url>
  JWT_SECRET: <base64-encoded-jwt-secret>
  GEMINI_API_KEY: <base64-encoded-gemini-key>
  REDIS_URL: <base64-encoded-redis-url>
```

### **4. Deployment**
```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rendimiento-backend
  namespace: rendimiento-inmobiliaria
spec:
  replicas: 3
  selector:
    matchLabels:
      app: rendimiento-backend
  template:
    metadata:
      labels:
        app: rendimiento-backend
    spec:
      containers:
      - name: backend
        image: rendimiento-backend:latest
        ports:
        - containerPort: 5000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: rendimiento-secrets
              key: DATABASE_URL
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: rendimiento-secrets
              key: JWT_SECRET
        - name: GEMINI_API_KEY
          valueFrom:
            secretKeyRef:
              name: rendimiento-secrets
              key: GEMINI_API_KEY
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: rendimiento-secrets
              key: REDIS_URL
        envFrom:
        - configMapRef:
            name: rendimiento-config
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health/live
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /api/health/ready
            port: 5000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        volumeMounts:
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: logs
        emptyDir: {}
```

### **5. Service**
```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: rendimiento-backend-service
  namespace: rendimiento-inmobiliaria
spec:
  selector:
    app: rendimiento-backend
  ports:
  - port: 80
    targetPort: 5000
  type: ClusterIP
```

### **6. Ingress**
```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rendimiento-ingress
  namespace: rendimiento-inmobiliaria
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
  - hosts:
    - api.tu-dominio.com
    secretName: rendimiento-tls
  rules:
  - host: api.tu-dominio.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: rendimiento-backend-service
            port:
              number: 80
```

### **7. HPA (Horizontal Pod Autoscaler)**
```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: rendimiento-backend-hpa
  namespace: rendimiento-inmobiliaria
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: rendimiento-backend
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## 🖥️ Despliegue Manual

### **1. Preparar Servidor**

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Instalar Redis
sudo apt install redis-server -y
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Instalar Nginx
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx

# Instalar PM2
sudo npm install -g pm2
```

### **2. Configurar Aplicación**

```bash
# Clonar repositorio
git clone https://github.com/tu-org/rendimiento-inmobiliaria-backend.git
cd rendimiento-inmobiliaria-backend

# Instalar dependencias
npm ci --only=production

# Configurar variables de entorno
cp .env.example .env
nano .env

# Generar cliente Prisma
npx prisma generate

# Sincronizar base de datos
npx prisma db push
```

### **3. Configurar PM2**

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'rendimiento-backend',
    script: 'index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

```bash
# Iniciar con PM2
pm2 start ecosystem.config.js --env production

# Configurar PM2 para iniciar con el sistema
pm2 startup
pm2 save
```

### **4. Configurar Nginx**

```nginx
# /etc/nginx/sites-available/rendimiento-backend
server {
    listen 80;
    server_name tu-dominio.com;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=1r/s;

    location /api/auth/ {
        limit_req zone=auth burst=5 nodelay;
        proxy_pass http://localhost:5000;
    }

    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:5000;
    }

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/rendimiento-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔒 Configuración de SSL

### **Con Let's Encrypt**

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtener certificado
sudo certbot --nginx -d tu-dominio.com

# Renovación automática
sudo crontab -e
# Agregar: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Monitoreo y Logs

### **Configurar Logrotate**

```bash
# /etc/logrotate.d/rendimiento-backend
/var/www/rendimiento-backend/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reload rendimiento-backend
    endscript
}
```

### **Monitoreo con Prometheus**

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'rendimiento-backend'
    static_configs:
      - targets: ['localhost:5000']
    metrics_path: '/api/health/metrics'
    scrape_interval: 30s
```

## 🚨 Troubleshooting

### **Problemas Comunes**

1. **Error de conexión a MongoDB**
   ```bash
   # Verificar estado
   sudo systemctl status mongod
   
   # Ver logs
   sudo journalctl -u mongod -f
   ```

2. **Error de memoria**
   ```bash
   # Verificar uso de memoria
   free -h
   
   # Reiniciar PM2
   pm2 restart rendimiento-backend
   ```

3. **Rate limiting excesivo**
   ```bash
   # Ajustar límites en nginx
   sudo nano /etc/nginx/sites-available/rendimiento-backend
   sudo systemctl reload nginx
   ```

### **Comandos de Diagnóstico**

```bash
# Estado de la aplicación
pm2 status
pm2 logs rendimiento-backend

# Estado de servicios
sudo systemctl status mongod redis-server nginx

# Verificar puertos
sudo netstat -tlnp | grep :5000

# Verificar logs de nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## ✅ Checklist de Despliegue

- [ ] Servidor configurado con requisitos mínimos
- [ ] Node.js 18+ instalado
- [ ] MongoDB 6.0+ instalado y configurado
- [ ] Redis 7.0+ instalado (opcional)
- [ ] Nginx configurado como reverse proxy
- [ ] Variables de entorno configuradas
- [ ] SSL/TLS configurado
- [ ] PM2 configurado para auto-restart
- [ ] Logs configurados y rotando
- [ ] Monitoreo configurado
- [ ] Health checks funcionando
- [ ] Rate limiting configurado
- [ ] Backup de base de datos configurado
- [ ] Documentación actualizada
