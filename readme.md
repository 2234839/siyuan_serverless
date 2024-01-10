# SiYuan serverless

本程序符合 serverless devs 规范，但目前支持自定义运行环境、单实例多并发、挂载 oss 、可限制只允许单实例的只有阿里云一家，所以只能部署在阿里云。

## 部署方式

### 从阿里云应用中心（推荐）


### 使用 serverless-devs/s3

```
npm install @serverless-devs/s3 -g
s add config # 配置密钥
s deploy -y
```
