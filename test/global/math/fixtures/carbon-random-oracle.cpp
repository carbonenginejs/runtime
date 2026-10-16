#include <cstdio>
#include <cstdlib>
#include <cstdint>
#include <random>
struct Vector3 { int x,y,z; Vector3(int a,int b,int c):x(a),y(b),z(c){} };
int main()
{
    srand(1);
    Vector3 v(rand(),rand(),rand());
    std::printf("constructorOrder %d %d %d\n",v.x,v.y,v.z);
    for (unsigned seed : {0u, 1u, 1234u, 0xffffffffu})
    {
        std::minstd_rand engine(seed);
        std::uniform_real_distribution<float> dist(0.f, 1.f);
        std::printf("minstd %u",seed);
        for(int i=0;i<8;i++) std::printf(" %.17g",double(dist(engine)));
        std::puts("");
    }
    srand(1);
    std::printf("crt");
    for(int i=0;i<8;i++) std::printf(" %d",rand());
    std::puts("");
    uint32_t state=1234;
    std::printf("tri");
    for(int i=0;i<8;i++) {state<<=12;state+=150889;state%=714025;std::printf(" %u",state);}
    std::puts("");
    std::printf("triOverflow %u\n",(uint32_t(int(10000000000LL))*uint32_t(207178))/714025);
    srand(1); uint32_t ps=rand();
    std::printf("particle");
    for(int i=0;i<8;i++) {
        uint32_t lo=16807*(ps & 0xffff),hi=16807*(ps>>16);
        lo+=(hi & 0x7fff)<<16;lo+=hi>>15;lo=(lo & 0x7fffffff)+(lo>>31);ps=lo;
        std::printf(" %u",lo);
    }
    std::puts("");
}
