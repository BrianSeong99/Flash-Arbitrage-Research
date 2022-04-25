const { expect } = require("chai");
const { ethers } = require("hardhat");
const hre = require("hardhat");
const { ethers: eth } = require("ethers");
const { ecsign } = require("ethereumjs-util");
const { expandTo18Decimals, getApprovalDigest } = require("./shared/utilities");

const TOTAL_SUPPLY = expandTo18Decimals(10000);
const TEST_AMOUNT = expandTo18Decimals(10);

const privatekeys = require("../private_keys.json");

describe("Uniswap", function () {
  async function setup(){
    const [owner, other] = await ethers.getSigners();
    const ERC20 = await ethers.getContractFactory("UniswapV2ERC20");
    const token = await ERC20.deploy();
    await token.deployed();
    return [owner, other, token];
  }

  it('name, symbol, decimals, totalSupply, balanceOf, DOMAIN_SEPARATOR, PERMIT_TYPEHASH', async () => {
    const [owner, other, token] = await setup();

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

  it('approve', async () => {
    const [owner, other, token] = await setup();
    await expect(token.approve(other.address, TEST_AMOUNT))
      .to.emit(token, 'Approval')
      .withArgs(owner.address, other.address, TEST_AMOUNT)
    expect(await token.allowance(owner.address, other.address)).to.eq(TEST_AMOUNT)
  })

  it('transfer', async () => {
    const [owner, other, token] = await setup();
    await expect(token.transfer(other.address, TEST_AMOUNT))
      .to.emit(token, 'Transfer')
      .withArgs(owner.address, other.address, TEST_AMOUNT)
    expect(await token.balanceOf(owner.address)).to.eq(TOTAL_SUPPLY.sub(TEST_AMOUNT))
    expect(await token.balanceOf(other.address)).to.eq(TEST_AMOUNT)
  })

  it('transfer:fail', async () => {
    const [owner, other, token] = await setup();
    await expect(token.transfer(other.address, TOTAL_SUPPLY.add(1))).to.be.reverted // ds-math-sub-underflow
    await expect(token.connect(other).transfer(owner.address, 1)).to.be.reverted // ds-math-sub-underflow
  })

  it('transferFrom', async () => {
    const [owner, other, token] = await setup();
    await token.approve(other.address, TEST_AMOUNT)
    await expect(token.connect(other).transferFrom(owner.address, other.address, TEST_AMOUNT))
      .to.emit(token, 'Transfer')
      .withArgs(owner.address, other.address, TEST_AMOUNT)
    expect(await token.allowance(owner.address, other.address)).to.eq(0)
    expect(await token.balanceOf(owner.address)).to.eq(TOTAL_SUPPLY.sub(TEST_AMOUNT))
    expect(await token.balanceOf(other.address)).to.eq(TEST_AMOUNT)
  })

  it('transferFrom:max', async () => {
    const [owner, other, token] = await setup();
    await token.connect(owner).approve(other.address, eth.constants.MaxInt256)
    expect(await token.allowance(owner.address, other.address)).to.eq(eth.constants.MaxInt256)
    await expect(token.connect(other).transferFrom(owner.address, other.address, TEST_AMOUNT))
      .to.emit(token, 'Transfer')
      .withArgs(owner.address, other.address, TEST_AMOUNT)
    expect(await token.balanceOf(owner.address)).to.eq(TOTAL_SUPPLY.sub(TEST_AMOUNT))
    expect(await token.balanceOf(other.address)).to.eq(TEST_AMOUNT)
  })
});

