# CI CD từ GitHub tới Docker Hub và Docker local

## Điều kiện tài khoản

Repository `tqkhanh2005/product-api` đã có remote local. Các thay đổi được chuẩn bị tại máy, chưa tự push/commit. Để chạy trên GitHub cần đưa các thay đổi này lên repository, cấu hình hai Actions secrets `DOCKERHUB_USERNAME` và `DOCKERHUB_TOKEN`. Token Docker Hub phải có quyền push repository product-api. Không đặt token vào mã nguồn hay `.env.example`.

## Ba workflow

1. `test-productci.yml`: npm ci -> lint -> unit tests.
2. `test-productci-prod.yml`: MongoDB thật trên runner -> integration -> build Compose -> container health -> HTTP health.
3. `cd-dockerhub.yml`: chạy lại các kiểm tra bắt buộc -> build và health image -> đăng nhập Docker Hub -> tag chính image vừa kiểm tra bằng full commit SHA và latest -> push. Không build lại image khác ở bước push.

Workflow chạy tại gốc repository. Với cấu trúc source hiện tại không có thư mục phase1-product-api; lỗi đường dẫn cũ đã được bỏ.

## Deploy thủ công từ Docker Hub xuống local

Sau khi workflow push image thành công:

```powershell
cd C:\dev\product-api
$env:DOCKERHUB_USERNAME = 'ten-dockerhub-cua-ban'
$env:IMAGE_TAG = 'full-commit-sha-da-qua-CI'
# Nếu repository image private, docker login trước (không đưa token lên dòng lệnh)
pwsh -File scripts/deploy-local.ps1
```

Script pull trước; pull thất bại thì không thay container đang chạy. Sau đó `docker compose -f docker-compose-prod.yaml up -d --wait`, kiểm tra HTTP status UP. Dùng chung project `product-api` và mongo-data volume với compose build local; dữ liệu sản phẩm được giữ lại. Không chạy cùng lúc hai deployment chứa container nammongodb/product-api.

## Deploy tự động tới Windows local

1. Trong GitHub repository -> Settings -> Actions -> Runners -> New self-hosted runner -> Windows. Thực hiện các lệnh đăng ký do GitHub cấp trên máy chạy Docker Desktop, thêm custom label **p1-deploy**. Giữ runner chạy trong phiên người dùng truy cập được Docker Desktop Linux Engine.
2. Repository -> Settings -> Environments -> tạo `local-demo`. Workflow đã tham chiếu môi trường này; đặt quy tắc duyệt nếu bạn muốn.
3. Chạy workflow_dispatch của cd-dockerhub và bật `deploy_local`, hoặc đặt repository variable `ENABLE_LOCAL_CD=true` để tự deploy mỗi push main. Mặc định false để không tạo job chờ khi máy chưa đăng ký runner.
4. Job deploy-local chỉ chạy trên `[self-hosted, Windows, p1-deploy]`, lấy đúng tag SHA của job đã kiểm chứng, đăng nhập bằng password-stdin, pull image và chờ healthy.

Không chạy job deploy-local cho pull request. Không dùng runner này cho repository public không đáng tin cậy. Runner cần có Docker CLI, PowerShell 7, Docker Desktop đã bật; cổng HOST_PORT mặc định 3000 phải trống hoặc đang phục vụ chính P1.

Phần cấu hình tài khoản/secrets/runner và chạy workflow trên GitHub cần tài khoản của chủ repository. Kiểm thử local không chứng minh đã push Docker Hub hoặc đã chạy CI từ xa.

Tham khảo chính thức: [GitHub self-hosted runners](https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/use-in-a-workflow), [runner labels](https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/apply-labels).
