// Native reference generator: compile on Windows x64 with MSVC /O2 /std:c++20.
// Uses default DirectXMath SSE (no SSE3/SSE4/AVX defines). Captured on AMD Ryzen 9 9950X3D.
// Run in a scratch directory; compares the normalized mantissa domain and exponent samples.
#include <DirectXMath.h>
#include <cstdio>
#include <cstring>
#include <cstdint>
#include <cmath>
#include <initializer_list>
using namespace DirectX;
float frombits(uint32_t x){float f;std::memcpy(&f,&x,4);return f;}
uint32_t bits(float f){uint32_t x;std::memcpy(&x,&f,4);return x;}
float estimate(uint32_t x){return _mm_cvtss_f32(_mm_rsqrt_ss(_mm_set_ss(frombits(x))));}
int main(){
 uint16_t table[8192];
 for(uint32_t i=0;i<8192;i++){
   float y=estimate(0x3f800000+(i<<11));
   if(y*32768!=std::trunc(y*32768))return 1;
   table[i]=uint16_t(y*32768);
 }
 unsigned checked=0;
 for(uint32_t i=0;i<0x1000000;i++){
  if(estimate(0x3f800000+i)!=float(table[i>>11])/32768)return 2;checked++;
 }
 for(unsigned e=1;e<255;e++)for(unsigned i=0;i<4096;i++)for(unsigned edge:{0u,1023u,2047u}){
   uint32_t word=(e<<23)|(i<<11)|edge;
   float expected=std::ldexp(float(table[i+((e&1)?0:4096)])/32768,-(int(e)-((e&1)?127:128))/2);
   if(estimate(word)!=expected)return 3;checked++;
 }
 std::fprintf(stderr,"Verified %u native estimates\n",checked);
 FILE* f;fopen_s(&f,"force-rsqrt-table.txt","w");for(auto v:table)std::fprintf(f,"%u\n",unsigned(v));std::fclose(f);

 FILE* g;fopen_s(&g,"particle-force-sse-cases.json","w");std::fprintf(g,"[\n");
 uint32_t seed=1234;
 auto sample=[&](){seed=seed*1664525u+1013904223u;return float(int(seed>>16)-32768)/1024.f;};
 auto vector=[&](){float x=sample(),y=sample(),z=sample();return XMVectorSet(x,y,z,0);};
 auto printVector=[&](FXMVECTOR v){XMFLOAT3 a;XMStoreFloat3(&a,v);std::fprintf(g,"[%u,%u,%u]",bits(a.x),bits(a.y),bits(a.z));};
 for(int i=0;i<64;i++){
   auto position=vector(),target=vector(),axis=vector(),velocity=vector();float magnitude=sample(),drag=sample(),mass=1.f,dt=.125f;
   if(i==0)position=target;
   if(i==1){target=XMVectorZero();position=XMVectorSet(1e-23f,0,0,0);}
   if(i==2){target=XMVectorZero();position=XMVectorSet(1e20f,0,0,0);}
   if(i==3)velocity=XMVectorZero();
   if(i>=4){drag=std::fabs(drag);float threshold=1.f/(XMVectorGetX(XMVector3LengthEst(velocity))*drag);dt=frombits(bits(threshold)+unsigned(i%3)-1);}
   auto direction=XMVectorSubtract(target,position);auto reciprocal=XMVector3ReciprocalLengthEst(direction);
   auto attractor=XMVectorScale(XMVectorSelect(XMVectorMultiply(direction,reciprocal),g_XMZero,XMVectorEqual(reciprocal,g_XMInfinity)),magnitude);
   direction=XMVector3Cross(direction,axis);reciprocal=XMVector3ReciprocalLengthEst(direction);
   auto vortex=XMVectorScale(XMVectorSelect(XMVectorMultiply(direction,reciprocal),g_XMZero,XMVectorEqual(reciprocal,g_XMInfinity)),magnitude);
   auto force=XMVectorMultiply(velocity,XMVectorScale(XMVector3LengthEst(velocity),-drag));
   auto predicted=XMVectorAdd(velocity,XMVectorScale(force,dt*mass));
   auto fluid=XMVectorSelect(force,XMVectorScale(velocity,-1.f/(dt*mass)),XMVectorLess(XMVector3Dot(predicted,velocity),XMVectorZero()));
   std::fprintf(g,"%s{\"position\":",i?",\n":"");printVector(position);std::fprintf(g,",\"target\":");printVector(target);std::fprintf(g,",\"axis\":");printVector(axis);std::fprintf(g,",\"velocity\":");printVector(velocity);
   std::fprintf(g,",\"magnitude\":%u,\"drag\":%u,\"dt\":%u,\"mass\":%u,\"attractor\":",bits(magnitude),bits(drag),bits(dt),bits(mass));printVector(attractor);std::fprintf(g,",\"vortex\":");printVector(vortex);std::fprintf(g,",\"fluid\":");printVector(fluid);std::fprintf(g,"}");
 }
 std::fprintf(g,"\n]\n");std::fclose(g);
}
