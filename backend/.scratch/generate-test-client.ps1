$env:DATABASE_URL = 'postgresql://generate:generate@localhost:5432/generate'
npx.cmd prisma generate
exit $LASTEXITCODE
