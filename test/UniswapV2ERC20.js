const { expect } = require("chai");
const { ethers } = require("hardhat");
const hre = require("hardhat");
const { ethers: eth } = require("ethers");
const { expandTo18Decimals } = require("./shared/utilities");

const TOTAL_SUPPLY = expandTo18Decimals(10000);
const TEST_AMOUNT = expandTo18Decimals(10);

describe("Uniswap", function () {
  it('name, symbol, decimals, totalSupply, balanceOf, DOMAIN_SEPARATOR, PERMIT_TYPEHASH', async () => {
    console.log("token contract");
    const [owner, other] = await ethers.getSigners();
    const ERC20 = await ethers.getContractFactory("UniswapV2ERC20");
    console.log("total", TOTAL_SUPPLY);
    const token = await ERC20.deploy();
    await token.deployed();

    const name = await token.name()
    expect(name).to.eq('Uniswap V2')
    expect(await token.symbol()).to.eq('UNI-V2')
    expect(await token.decimals()).to.eq(18)
    expect(await token.totalSupply()).to.eq(TOTAL_SUPPLY)
    expect(await token.balanceOf(owner.address)).to.eq(TOTAL_SUPPLY)
    expect(await token.DOMAIN_SEPARATOR()).to.eq(
      eth.utils.keccak256(
        eth.utils.defaultAbiCoder.encode(
          ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
          [
            eth.utils.keccak256(
              eth.utils.toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')
            ),
            eth.utils.keccak256(eth.utils.toUtf8Bytes(name)),
            eth.utils.keccak256(eth.utils.toUtf8Bytes('1')),
            hre.network.config.chainId,
            token.address
          ]
        )
      )
    )
    expect(await token.PERMIT_TYPEHASH()).to.eq(
      eth.utils.keccak256(eth.utils.toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)'))
    )
  });
});

